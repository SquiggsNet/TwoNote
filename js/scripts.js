var APP_CLIENT_ID = "c8bf6910-095b-4fdc-869d-e9109e80e88a";
var REDIRECT_URL = "https://squiggs.net/twoNote";
var first_name = "";
var last_name = "";
var token
var selectedID = "";
var searchTerm = "";

WL.Event.subscribe("auth.login", onLogin);
WL.Event.subscribe("auth.logout", onLogout);
WL.init({
	client_id: APP_CLIENT_ID,
	redirect_uri: REDIRECT_URL,
	scope: "wl.signin office.onenote_update",
	response_type: "token"
});
WL.ui({
	name: "signin",
	element: "signin"
});

function onLogin (session) {
	if (!session.error) {
		token = session.session.access_token;
		performAjaxCall("allNotes");
		$("#app").show();
	}
	else {
		$("#info").HTML("Error signing in: " + session.error_description);
		$( "#info" ).dialog();
	}	
}

function onLogout(){
	$("#app").hide();
	$("#list").html("");
	$("#info").html("");
};

function performAjaxCall(callType, saveData){
	if(callType == "allNotes"){
		var urlCall = "https://www.onenote.com/api/v1.0/me/notes/pages";
		var typeCall = "GET";
		var contentType = "";
	}else if(callType == "oneNote"){
		var urlCall = "https://www.onenote.com/api/v1.0/me/notes/pages/"+ selectedID +"/content";
		var typeCall = "GET";
		var contentType = "";
	}else if(callType == "searchNotes"){
		var urlCall = "https://www.onenote.com/api/v1.0/me/notes/pages?search="+ searchTerm;
		var typeCall = "GET";
		var contentType = "";
	}else if(callType == "delete"){
		var urlCall = "https://www.onenote.com/api/v1.0/me/notes/pages/"+ selectedID;
		var typeCall = "DELETE";
		var contentType = "";
	}else if(callType == "save"){
		var urlCall = "https://www.onenote.com/api/v1.0/me/notes/pages";
		var typeCall = "POST";
		var dataCall = saveData;
		
	}	else if(callType == "update"){
		var urlCall = "https://www.onenote.com/api/v1.0/me/notes/pages/"+ selectedID +"/content";
		var typeCall = "PATCH";
		var dataCall = "[{'target': '#_default',"+
					  "'action': 'replace',"+
						"'content': '"+saveData+"'}]";
	}

	$.ajax({
		url: urlCall,
		method: typeCall,
		data: dataCall,			
		beforeSend: function(xhr){
			xhr.setRequestHeader('Authorization', 'Bearer ' + token);
			if(callType == "save"){
				xhr.setRequestHeader('Content-Type', 'application/xhtml+xml');				
			}
			if(callType == "update"){
				xhr.setRequestHeader('Content-Type', 'application/json');				
			}
		},
		success: function(data) {
			if(callType == "allNotes" || callType == "searchNotes"){
				displayAllNotes(data);
			}else if(callType == "oneNote"){
				displayOneNote(data);
			}else if(callType == "delete"){
				refresh();			
			}else if(callType == "save"){
				selectedID = data.id;
				refreshAndLoad();			
			}
		}
	});
	WL.api({
		path: "me",
		method: "GET"
	}).then(
		function (response) {	
			$("#app").show();	
			first_name = response.first_name;
			last_name = response.last_name;
			
		},
		function (responseFailed) {
			$("#info").HTML("Error calling API: " + responseFailed.error.message);
			$( "#info" ).dialog();
		}
	);
	
}

function refresh(){
	performAjaxCall("allNotes");			
}

function refreshAndLoad(){
	performAjaxCall("allNotes");
	performAjaxCall("oneNote");	
}

function displayAllNotes(data){
	$("#noteHeading").replaceWith("<h4 id='noteHeading'>Select a note</h4>");
	var list = $("#list");
	list.empty();
	var noteBody = $("#note_body");
	noteBody.empty();
	noteBody.attr('disabled', false);
	if (data.value != null) {
		for (var i = 0; i < data.value.length; i++) {
			list.append('<li><button type="button" class="noteSelect btn btn-default btn-block" id="'
			+ data.value[i].id +'"><span class="glyphicon glyphicon-envelope"> ' + data.value[i].title 
			+ "</span></button></li>");
		}
	}
	
	$(".noteSelect").click(function(){					
		selectedID = this.id;
		$("#edit").attr("disabled",false);
		$("#save").attr("disabled","disabled");
		performAjaxCall("oneNote");
	});
	$("#save").attr("disabled",false);
}

function displayOneNote(data){
	$("#noteHeading").replaceWith("<h4 id='noteHeading'>"+$(data).filter('title').text()+"</h4>");
	
	var noteBody = $("#note_body");
	noteBody.empty();
	var body = $(data).filter('div')[0];
	if (body.children != null) {
		for (var i = 0; i < body.children.length; i++) {
			noteBody.append(body.children[i].innerHTML+"&#13;&#10;");					
		}
	}
	noteBody.attr("disabled","disabled");
	//selectedID = "";
};

$(function() {
		
	$("#app").hide();
	$("#list").html("");
	$("#info").html("");
	
	$("#about").click(function() {
		$( "#info" ).html("Hello, "+first_name+" "+last_name+"!");
		$( "#info" ).dialog();	
	});
	
	$("#add").click(function(){
		$("#noteHeading").replaceWith("<h4 id='noteHeading'>New note...</h4>");
		$("#note_body").empty();
		$("#note_body").attr('disabled', false);
		$("#save").attr("disabled",false);
		selectedID = "";
	});
	
	$("#edit").click(function(){
		$("#edit").attr("disabled","disabled");
		$("#save").attr("disabled",false);
		$("#note_body").attr('disabled', false);
	});
	
	$("#search-note").keyup(function(){
		searchTerm = encodeURI(this.value)
		performAjaxCall("searchNotes");
	});
	
	$("#delete").click(function(){
		$("#info").html("Are you sure you would like to delete the selected note? I cannot be retreived!");
		$("#info").dialog({
			resizable: false,
			height: "auto",
			width: 400,
			modal: true,
			buttons: {
				"Delete Note": function() {
					performAjaxCall("delete");
					$( this ).dialog( "close" );
				},
				Cancel: function() {
					$( this ).dialog( "close" );
				}
			}
		});
	});
	
	$("#save").click(function(){
		var noteBodyInput = $("#note_body").val().split('\n');
		if(selectedID==""){
			
			$("#info").html("Please enter the name of your note"+
				"<form action='' method='post'>"+
				"<label>Title:</label>"+
				"<input id='noteTitleInput' name='title' type='text'>"+
				"</form>");
			$("#info").dialog({
				resizable: false,
				height: "auto",
				width: 400,
				modal: true,
				buttons: {
					"Create Note": function() {
						// var currentTitles = $();
						// $(".noteSelect").each(function( index, item ) {
							// currentTitles.add(item.innerText)
						// });

						var newTitle = " "+$("#noteTitleInput").val();
						// if(jQuery.inArray(newTitle, currentTitles)!='-1'){
							// $( "#info" ).html("Note name already exists"+
								// "<form action='' method='post'>"+
								// "<label>Title:</label>"+
								// "<input id='noteTitleInput' name='title' type='text'>"+
								// "</form>");
							// $( "#info" ).dialog();
						// }else{					
							var submitNoteInput = "<html> <head> <title>"+
								$("#noteTitleInput").val()+"</title></head>"+
								"<body>";
								$.each(noteBodyInput, function(index, item) {
									  submitNoteInput += "<p>"+item+"</p>";         
								  });
								submitNoteInput += "</body></html>";
							
								performAjaxCall("save", submitNoteInput);
								$( this ).dialog( "close" );
						// }
					},
					Cancel: function() {
						$( this ).dialog( "close" );
					}
				}
			});
		}else{
			var submitNoteInput = "";
				$.each(noteBodyInput, function(index, item) {
					  submitNoteInput += "<p>"+item+"</p>";         
				  });

			performAjaxCall("update", submitNoteInput);
		}
	});
});

$(document).ajaxStart(function(){
    $("#loader").show();
});

$(document).ajaxStop(function(){
    $("#loader").hide();
});