YUI.add("moodle-mod_bigbluebuttonbn-broker",function(e,t){M.mod_bigbluebuttonbn=M.mod_bigbluebuttonbn||{},M.mod_bigbluebuttonbn.broker={datasource:null,bigbluebuttonbn:{},init:function(t){this.datasource=new e.DataSource.Get({source:M.cfg.wwwroot+"/mod/bigbluebuttonbn/bbb_broker.php?"}),this.bigbluebuttonbn=t},join_redirect:function(e){window.open(e)},recording_action_perform:function(e){var t="action=recording_"+e.action+"&id="+e.recordingid;t+=this.recording_action_meta_qs(e),this.datasource.sendRequest({request:t,callback:{success:function(t){return typeof e.goalstate=="undefined"?M.mod_bigbluebuttonbn.recordings.recording_action_completion(e):t.data.status?(e.attempt=1,M.mod_bigbluebuttonbn.broker.recording_action_performed(e)):(e.message=t.data.message,M.mod_bigbluebuttonbn.recordings.recording_action_failover(e))},failure:function(t){return e.message=t.error.message,M.mod_bigbluebuttonbn.recordings.recording_action_failover(e)}}})},recording_action_meta_qs:function(e){var t="";if(typeof e.source!="undefined"){var n={};n[e.source]=encodeURIComponent(e.goalstate),t+="&meta="+JSON.stringify(n)}return t},recording_action_performed:function(e){var t="action=recording_info&id="+e.recordingid+"&idx="+e.meetingid;t+=this.recording_action_meta_qs(e),this.datasource.sendRequest({request:t,callback:{success:function(t){if(typeof t.data[e.source]=="undefined"){e.message=M.util.get_string("view_error_current_state_not_found","bigbluebuttonbn"),M.mod_bigbluebuttonbn.recordings.recording_action_failover(e);return}if(t.data[e.source]===e.goalstate){M.mod_bigbluebuttonbn.recordings.recording_action_completion(e);return}if(e.attempt<5){e.attempt+=1,setTimeout(function(){return function(){M.mod_bigbluebuttonbn.broker.recording_action_performed(e)}}(this),(e.attempt-1)*1e3);return}e.message=M.util.get_string("view_error_action_not_completed","bigbluebuttonbn"),M.mod_bigbluebuttonbn.recordings.recording_action_failover(e)},failure:function(t){e.message=t.error.message,M.mod_bigbluebuttonbn.recordings.recording_action_failover(e)}}})},recording_current_state:function(e,t){return e==="publish"||e==="unpublish"?t.published:e==="delete"?t.status:e==="protect"||e==="unprotect"?t.secured:e==="update"?t.updated:null},end_meeting:function(){var e="action=meeting_end&id="+this.bigbluebuttonbn.meetingid;e+="&bigbluebuttonbn="+this.bigbluebuttonbn.bigbluebuttonbnid,this.datasource.sendRequest({request:e,callback:{success:function(e){e.data.status&&(M.mod_bigbluebuttonbn.rooms.clean_control_panel(),M.mod_bigbluebuttonbn.rooms.hide_join_button(),M.mod_bigbluebuttonbn.rooms.hide_end_button(),location.reload())}}})}}},"@VERSION@",{requires:["base","node","datasource-get","datasource-jsonschema","datasource-polling","moodle-core-notification"]});
