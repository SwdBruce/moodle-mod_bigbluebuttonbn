YUI.add('moodle-mod_bigbluebuttonbn-rooms', function (Y, NAME) {

// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/** global: M */
/** global: Y */

M.mod_bigbluebuttonbn = M.mod_bigbluebuttonbn || {};

M.mod_bigbluebuttonbn.rooms = {

    datasource: null,
    bigbluebuttonbn: {},
    panel: null,
    pinginterval: 10000,

    /**
     * Initialise the broker code.
     *
     * @method init
     */
    init: function(bigbluebuttonbn) {
        this.datasource = new Y.DataSource.Get({
            source: M.cfg.wwwroot + "/mod/bigbluebuttonbn/bbb_broker.php?"
        });
        this.bigbluebuttonbn = bigbluebuttonbn;
        this.pinginterval = bigbluebuttonbn.ping_interval;

        if (this.bigbluebuttonbn.profile_features.includes('all') || this.bigbluebuttonbn.profile_features.includes('showroom')) {
            this.init_room();
        }
    },

    init_room: function() {
        if (this.bigbluebuttonbn.activity !== 'open') {
            var status_bar = [M.util.get_string('view_message_conference_has_ended', 'bigbluebuttonbn')];
            if (this.bigbluebuttonbn.activity !== 'ended') {
                status_bar.push(this.bigbluebuttonbn.opening);
                status_bar.push(this.bigbluebuttonbn.closing);
            }
            Y.DOM.addHTML(Y.one('#status_bar'), this.init_status_bar(status_bar));
            return;
        }
        this.init_room_open();
    },

    init_room_open: function() {
        // Create the main modal form.
        this.panel = new Y.Panel({
            srcNode: '#panelContent',
            headerContent: M.util.get_string('view_recording_modal_title', 'bigbluebuttonbn'),
            width: 250,
            zIndex: 5,
            centered: true,
            modal: true,
            visible: false,
            render: true,
            plugins: [Y.Plugin.Drag]
        });

        // Define the apply function - this will be called when 'Apply' is pressed in the modal form.
        this.panel.addButton({
            value: M.util.get_string('view_recording_modal_button', 'bigbluebuttonbn'),
            section: Y.WidgetStdMod.FOOTER,
            action: function(e) {
                e.preventDefault();
                this.panel.hide();

                var joinField = Y.one('#meeting_join_url');
                var messageField = Y.one('#meeting_message');
                var nameField = Y.one('#recording_name');
                var descriptionField = Y.one('#recording_description');
                var tagsField = Y.one('#recording_tags');

                // Gatter the fields thay will be passed as metaparameters to the bbb server.
                var name = nameField.get('value').replace(/</g, "&lt;").replace(/>/g, "&gt;");
                var description = descriptionField.get('value').replace(/</g, "&lt;").replace(/>/g, "&gt;");
                var tags = tagsField.get('value').replace(/</g, "&lt;").replace(/>/g, "&gt;");

                // Prepare the new join_url.
                var join_url = joinField.get('value') + '&name=' + name + '&description=' + description + '&tags=' + tags;

                // Executes the join.
                M.mod_bigbluebuttonbn.broker.executeJoin(join_url, messageField.get('value'));

                // Clean values in case the for is used again.
                nameField.set('value', '');
                descriptionField.set('value', '');
                tagsField.set('value', '');
                joinField.set('value', '');
                messageField.set('value', '');
            }
        });

        this.update_room();
    },

    update_room: function() {
        var status_bar = Y.one('#status_bar');
        var control_panel = Y.one('#control_panel');
        var join_button = Y.one('#join_button');
        var end_button = Y.one('#end_button');
        var id = this.bigbluebuttonbn.meetingid;
        var bnid = this.bigbluebuttonbn.bigbluebuttonbnid;
        this.datasource.sendRequest({
            request: 'action=meeting_info&id=' + id + '&bigbluebuttonbn=' + bnid,
            callback: {
                success: function(e) {
                    Y.DOM.addHTML(status_bar, M.mod_bigbluebuttonbn.rooms.init_status_bar(e.data.status.message));
                    Y.DOM.addHTML(control_panel, M.mod_bigbluebuttonbn.rooms.init_control_panel(e.data));
                    if (typeof e.data.status.can_join != 'undefined') {
                        Y.DOM.addHTML(join_button, M.mod_bigbluebuttonbn.rooms.init_join_button(e.data.status));
                    }
                    if (typeof e.data.status.can_end != 'undefined' && e.data.status.can_end) {
                        Y.DOM.addHTML(end_button, M.mod_bigbluebuttonbn.rooms.init_end_button(e.data.status));
                    }
                    if (!e.data.status.can_join) {
                        M.mod_bigbluebuttonbn.rooms.wait_moderator({
                            id: id,
                            bnid: bnid
                        });
                    }
                }
            }
        });
    },

    init_status_bar: function(status_message) {

        var status_bar_span = Y.DOM.create('<span>');
        Y.DOM.setAttribute(status_bar_span, 'id', 'status_bar_span');

        if (status_message.constructor === Array) {
            for (var message in status_message) {
                if (!status_message.hasOwnProperty(message)) {
                    continue; // Skip keys from the prototype.
                }
                var status_bar_span_span = Y.DOM.create('<span>');
                Y.DOM.setAttribute(status_bar_span_span, 'id', 'status_bar_span_span');
                Y.DOM.setText(status_bar_span_span, status_message[message]);
                Y.DOM.addHTML(status_bar_span, status_bar_span_span);
                Y.DOM.addHTML(status_bar_span, Y.DOM.create('<br>'));
            }
        } else {
            Y.DOM.setText(status_bar_span, status_message);
        }

        return status_bar_span;
    },

    init_control_panel: function(data) {
        var control_panel_div = Y.DOM.create('<div>');

        Y.DOM.setAttribute(control_panel_div, 'id', 'control_panel_div');
        var control_panel_div_html = '';
        if (data.running) {
            control_panel_div_html += this.msg_started_at(data.info.startTime) + ' ';
            control_panel_div_html += this.msg_attendees_in(data.info.moderatorCount, data.info.participantCount);
        }
        Y.DOM.addHTML(control_panel_div, control_panel_div_html);

        return (control_panel_div);
    },

    msg_started_at: function(startTime) {

        var start_timestamp = (parseInt(startTime, 10) - parseInt(startTime, 10) % 1000);
        var date = new Date(start_timestamp);
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var started_at = M.util.get_string('view_message_session_started_at', 'bigbluebuttonbn');
        return started_at + ' <b>' + hours + ':' + (minutes < 10 ? '0' : '') + minutes + '</b>.';
    },

    msg_attendees_in: function(moderators, participants) {

        if (typeof participants == 'undefined' || participants === 0) {
            return M.util.get_string('view_message_session_no_users', 'bigbluebuttonbn') + '.';
        }

        var msg = M.util.get_string('view_message_session_has_users', 'bigbluebuttonbn');
        var msg_moderators = M.util.get_string('view_message_moderators', 'bigbluebuttonbn');
        var msg_viewers = M.util.get_string('view_message_viewers', 'bigbluebuttonbn');

        if (participants == 1) {
            if (moderators > 0) {
                return msg + ' <b>1</b> ' + msg_moderators + '.';
            }

            return msg + ' <b>1</b> ' + msg_viewers + '.';
        }

        var viewers = participants - moderators;

        if (moderators == 1) {
            msg_moderators = M.util.get_string('view_message_moderator', 'bigbluebuttonbn');
        }

        if (moderators == 1) {
            msg_viewers = M.util.get_string('view_message_viewer', 'bigbluebuttonbn');
        }

        return msg + ' <b>' + moderators + '</b> ' + msg_moderators + ' and <b>' + viewers + '</b> ' + msg_viewers + '.';
    },

    init_join_button: function(status) {
        var join_button_input = Y.DOM.create('<input>');

        Y.DOM.setAttribute(join_button_input, 'id', 'join_button_input');
        Y.DOM.setAttribute(join_button_input, 'type', 'button');
        Y.DOM.setAttribute(join_button_input, 'value', status.join_button_text);
        Y.DOM.setAttribute(join_button_input, 'class', 'btn btn-primary');

        var input_html = 'M.mod_bigbluebuttonbn.broker.join(\'';
        input_html += status.join_url + '\', \'' + M.util.get_string('view_message_conference_in_progress',
            'bigbluebuttonbn');
        input_html += '\', ' + status.can_tag + ');';
        Y.DOM.setAttribute(join_button_input, 'onclick', input_html);

        if (!status.can_join) {
            // Disable join button.
            Y.DOM.setAttribute(join_button_input, 'disabled', true);
            var status_bar_span = Y.one('#status_bar_span');
            // Create a img element.
            var spinning_wheel = Y.DOM.create('<img>');
            Y.DOM.setAttribute(spinning_wheel, 'id', 'spinning_wheel');
            Y.DOM.setAttribute(spinning_wheel, 'src', 'pix/processing16.gif');
            // Add the spinning wheel.
            Y.DOM.addHTML(status_bar_span, '&nbsp;');
            Y.DOM.addHTML(status_bar_span, spinning_wheel);
        }

        return join_button_input;
    },

    init_end_button: function(status) {
        var end_button_input = Y.DOM.create('<input>');

        Y.DOM.setAttribute(end_button_input, 'id', 'end_button_input');
        Y.DOM.setAttribute(end_button_input, 'type', 'button');
        Y.DOM.setAttribute(end_button_input, 'value', status.end_button_text);
        Y.DOM.setAttribute(end_button_input, 'class', 'btn btn-secondary');
        if (status.can_end) {
            Y.DOM.setAttribute(end_button_input, 'onclick', 'M.mod_bigbluebuttonbn.broker.end_meeting();');
        }

        return end_button_input;
    },

    remote_update: function(delay) {
        setTimeout(function() {
            M.mod_bigbluebuttonbn.rooms.clean_room();
            M.mod_bigbluebuttonbn.rooms.update_room();
        }, delay);
    },

    clean_room: function() {
        this.clean_status_bar();
        this.clean_control_panel();
        this.clean_join_button();
        this.clean_end_button();
    },

    clean_status_bar: function() {
        Y.one('#status_bar_span').remove();
    },

    clean_control_panel: function() {
        Y.one('#control_panel_div').remove();
    },

    clean_join_button: function() {
        Y.one('#join_button').setContent('');
    },

    hide_join_button: function() {
        Y.DOM.setStyle(Y.one('#join_button'), 'visibility', 'hidden');
    },

    show_join_button: function() {
        Y.DOM.setStyle(Y.one('#join_button'), 'visibility', 'shown');
    },

    clean_end_button: function() {
        Y.one('#end_button').setContent('');
    },

    hide_end_button: function() {
        Y.DOM.setStyle(Y.one('#end_button'), 'visibility', 'hidden');
    },

    show_end_button: function() {
        Y.DOM.setStyle(Y.one('#end_button'), 'visibility', 'shown');
    },

    window_close: function() {
        window.onunload = function() {
            /* global: opener */
            opener.M.mod_bigbluebuttonbn.rooms.remote_update(5000);
        };
        window.close();
    },

    wait_moderator: function(payload) {
        this.datasource.sendRequest({
            request: "action=meeting_info&id=" + payload.id + "&bigbluebuttonbn=" + payload.bnid,
            callback: {
                success: function(e) {
                    if (e.data.running) {
                        M.mod_bigbluebuttonbn.rooms.clean_room();
                        M.mod_bigbluebuttonbn.rooms.update_room();
                    }

                    return setTimeout(((function() {
                        return function() {
                            M.mod_bigbluebuttonbn.rooms.wait_moderator(payload);
                        };
                    })(this)), M.mod_bigbluebuttonbn.rooms.pinginterval);
                },
                failure: function(e) {
                    payload.message = e.error.message;
                }
            }
        });
    }

};


}, '@VERSION@', {
    "requires": [
        "base",
        "node",
        "datasource-get",
        "datasource-jsonschema",
        "datasource-polling",
        "moodle-core-notification"
    ]
});