function DetailAssistant() {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
}

DetailAssistant.prototype.setup = function() {
    /* setup widgets here */

    //Menu
    this.appMenuAttributes = { omitDefaultItems: true };
    this.appMenuModel = {
        label: "Settings",
        items: [{
            label: $L('Select All'),
            command: Mojo.Menu.selectAllCmd,
            shortcut: 'a',
            disabled: false
        }, {
            label: $L('Copy'),
            command: Mojo.Menu.copyCmd,
            shortcut: 'c',
            disabled: false
        }]
    };
    this.controller.setupWidget(Mojo.Menu.appMenu, this.appMenuAttributes, this.appMenuModel);

    //Command Buttons
    this.cmdMenuAttributes = {
            spacerHeight: 0,
            menuClass: 'no-fade'
        },
        this.cmdMenuModel = {
            visible: true,
            items: [{
                    items: [
                        { label: 'Back', icon: 'back', command: 'do-goBack' }
                    ]
                },
                {
                    items: [
                        { label: 'Share', iconPath: 'images/share.png', command: 'do-share' },
                        { label: 'Copy', iconPath: 'images/copy.png', command: 'do-copy' }
                    ]
                }
            ]
        };

    this.controller.setupWidget(Mojo.Menu.commandMenu, this.cmdMenuAttributes, this.cmdMenuModel);

    /* add event handlers to listen to events from widgets */
};

DetailAssistant.prototype.activate = function(event) {

    //Bind selected podcast to scene elements
    Mojo.Log.info(JSON.stringify(appModel.LastPodcastSelected));
    $("divPodcastTitle").innerHTML = appModel.LastPodcastSelected.title;
    $("divPodcastImage").src = serviceModel.buildURL("image") + "?" + serviceModel.base64UrlEncode(appModel.LastPodcastSelected.image);
    Mojo.Log.info($("divPodcastImage").src);
    $("divPodcastDescription").innerHTML = appModel.LastPodcastSelected.description;
    $("divPodcastAuthor").innerHTML = appModel.LastPodcastSelected.author;
    $("divPodcastLink").innerHTML = "<a href=\"" + appModel.LastPodcastSelected.link + "\">" + appModel.LastPodcastSelected.link + "</a>"
    $("txtFullFeed").value = appModel.LastPodcastSelected.url;
    $("txtTinyFeed").value = serviceModel.buildURL("tiny") + "?url=" + serviceModel.base64UrlEncode(appModel.LastPodcastSelected.url) + "&max=" + appModel.AppSettingsCurrent["ShowMax"];

    /* put in event handlers here that should only be in effect when this scene is active. For
       example, key handlers that are observing the document */
    // Non-Mojo widgets
    $("divFullFeed").addEventListener("click", this.focusFullFeed.bind(this));
    $("txtFullFeed").addEventListener("click", this.focusFullFeed.bind(this));
    $("divTinyFeed").addEventListener("click", this.focusTinyFeed.bind(this));
    $("txtTinyFeed").addEventListener("click", this.focusFullFeed.bind(this));
};


//Handle menu and button bar commands
DetailAssistant.prototype.handleCommand = function(event) {

    Mojo.Log.info("handling command button press for command: " + event.command);
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
            case 'do-goBack':
                var stageController = Mojo.Controller.stageController;
                stageController.swapScene({ transition: Mojo.Transition.crossFade, name: "main" });
                break;
            case 'do-share':
                this.controller.showAlertDialog({
                    onChoose: function(value) {
                        if (value == "yes") {
                            shareServiceModel.DoShareAddRequest(JSON.stringify(appModel.LastPodcastSelected), "application/json", function(response) {
                                if (response) {
                                    Mojo.Controller.getAppController().showBanner({ messageText: "Podcast shared!" }, "notifications", "");
                                }
                            }.bind(this));
                        }
                    },
                    title: "webOS Sharing Service",
                    message: "This will share the selected podcast with all other webOS users. Do you want to proceed?",
                    choices: [
                        { label: "Share", value: "yes", type: "affirmative" },
                        { label: "Cancel", value: "no", type: "negative" }
                    ]
                });
                break;
            case 'do-copy':
                if (document.activeElement.id.indexOf("txt") == 0) {
                    document.execCommand('copy');
                    var message = "Feed copied!";
                    if (document.activeElement.id == "txtFullFeed")
                        message = "Full " + message;
                    else
                        message = "Tiny " + message;
                    Mojo.Controller.getAppController().showBanner(message, { source: 'notification' });
                } else {
                    Mojo.Additions.ShowDialogBox("No Feed Selected", "Tap the feed you want to copy first!");
                }
                break;
        }
    }
};

DetailAssistant.prototype.focusFullFeed = function(event) {
    var useElem = "txtFullFeed";
    var dimElem = "txtTinyFeed";
    document.getElementById(dimElem).disabled = true;
    document.getElementById(useElem).disabled = false;
    document.getElementById(useElem).select();
    Mojo.Log.info("done focus");
}

DetailAssistant.prototype.focusTinyFeed = function(event) {
    var useElem = "txtTinyFeed";
    var dimElem = "txtFullFeed";
    document.getElementById(dimElem).disabled = true;
    document.getElementById(useElem).disabled = false;
    document.getElementById(useElem).select();
    Mojo.Log.info("done focus");
}

DetailAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */

    //Mojo.Event.stopListening(this.controller.get("btnOK"), Mojo.Event.tap, this.okClick.bind(this));
};

DetailAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */

};