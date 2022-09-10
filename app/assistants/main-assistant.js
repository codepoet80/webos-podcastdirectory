/*
    Podcast Directory app for webOS.
    This app depends on a Retro Podcast service, which is by webOS Archive at no cost for what remains of the webOS mobile community.
*/

function MainAssistant() {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
}

MainAssistant.prototype.setup = function() {

    appModel.SetThemePreference(this.controller);

    this.controller.setupWidget('txtSearch',
        this.attributes = {
            hintText: 'Search PodcastIndex...',
            multiline: false,
            autoFocus: true,
            focusMode: Mojo.Widget.focusSelectMode
        },
        this.model = {
            value: '',
            disabled: false
        }
    );

    //Search button - with global members for easy toggling later
    this.submitBtnAttrs = {};
    this.submitBtnModel = {
        label: "Search",
        disabled: false
    };
    this.controller.setupWidget("btnGet", this.submitBtnAttrs, this.submitBtnModel);
    //Loading spinner - with global members for easy toggling later
    this.spinnerAttrs = {
        spinnerSize: Mojo.Widget.spinnerLarge
    };
    this.spinnerModel = {
        spinning: false
    }
    this.controller.setupWidget('workingSpinner', this.spinnerAttrs, this.spinnerModel);
    //Search Results List (starts empty)
    this.emptyResults = [
        { id: "-1", videoName: "Empty", thumbnail: "", selectedState: true }
    ]
    this.resultsListElement = this.controller.get('searchResultsList');
    this.resultsInfoModel = {
        items: this.emptyResults
    };
    //Search Result List templates (loads other HTML)
    this.template = {
        itemTemplate: 'main/item-template',
        listTemplate: 'main/list-template',
        swipeToDelete: false,
        renderLimit: 25,
        reorderable: false
    };
    this.controller.setupWidget('searchResultsList', this.template, this.resultsInfoModel);
    //Menu
    this.appMenuAttributes = { omitDefaultItems: true };
    this.appMenuModel = {
        label: "Settings",
        items: [
            Mojo.Menu.editItem,
            { label: "Preferences", command: 'do-Preferences' },
            { label: "About", command: 'do-myAbout' }
        ]
    };
    this.controller.setupWidget(Mojo.Menu.appMenu, this.appMenuAttributes, this.appMenuModel);

    /* Always on Event handlers */
    Mojo.Event.listen(this.controller.get("btnGet"), Mojo.Event.tap, this.handleClick.bind(this));
    Mojo.Event.listen(this.controller.get("searchResultsList"), Mojo.Event.listTap, this.handleListClick.bind(this));
    // Non-Mojo widgets
    $("btnClear").addEventListener("click", this.handleClearTap.bind(this));
    this.keyupHandler = this.handleKeyUp.bindAsEventListener(this);
    this.controller.document.addEventListener("keyup", this.keyupHandler, true);

    //Check for updates
    if (!appModel.UpdateCheckDone) {
        appModel.UpdateCheckDone = true;
        updaterModel.CheckForUpdate("Podcast Directory", this.handleUpdateResponse.bind(this));
    }
};

MainAssistant.prototype.handleUpdateResponse = function(responseObj) {
    if (responseObj && responseObj.updateFound) {
        updaterModel.PromptUserForUpdate(function(response) {
            if (response)
                updaterModel.InstallUpdate();
        }.bind(this));
    }
}

MainAssistant.prototype.activate = function(event) {

    serviceModel.UseCustomEndpoint = appModel.AppSettingsCurrent["UseCustomEndpoint"];
    serviceModel.CustomEndpointURL = appModel.AppSettingsCurrent["EndpointURL"];
    if (appModel.AppSettingsCurrent["FirstRun"]) {
        appModel.AppSettingsCurrent["FirstRun"] = false;
        appModel.SaveSettings();
        Mojo.Additions.ShowDialogBox("Welcome to Podcast Directory!", "This is a client for a Retro Podcast service. You can use the community server for free, or use your own server if you want. If a Podcast doesn't work, try the 'Tiny' version, which fetches HTTPS podcasts on the fly for tiny devices that can't handle modern encryption.");
    }

    //find out what kind of device this is
    if (Mojo.Environment.DeviceInfo.platformVersionMajor >= 3) {
        this.DeviceType = "TouchPad";
        Mojo.Log.info("Device detected as TouchPad");
    } else {
        if (window.screen.width == 800 || window.screen.height == 800) {
            this.DeviceType = "Pre3";
            Mojo.Log.info("Device detected as Pre3");
        } else if ((window.screen.width == 480 || window.screen.height == 480) && (window.screen.width == 320 || window.screen.height == 320)) {
            this.DeviceType = "Pre";
            Mojo.Log.warn("Device detected as Pre or Pre2");
        } else {
            this.DeviceType = "Tiny";
            Mojo.Log.warn("Device detected as Pixi or Veer");
        }
    }
    //handle launch with search query
    if (appModel.LaunchQuery != "") {
        Mojo.Log.info("using launch query: " + appModel.LaunchQuery);
        $("txtSearch").mojo.setValue(appModel.LaunchQuery);
        this.handleClick();
    } else {
        var busy = false;
        if (appModel.LastSearchString) {
            $("txtSearch").mojo.setValue(appModel.LastSearchString);
            busy = true;
        }
        if (appModel.LastSearchResult && Array.isArray(appModel.LastSearchResult) && appModel.LastSearchResult.length > 0) {
            this.updateSearchResultsList(appModel.LastSearchResult);
            busy = true;
        }
        if (!busy) {
            this.getUserRecommendations();
        }
    }
    //Get ready for input!
    $("txtSearch").mojo.focus();
};

//Handle menu and button bar commands
MainAssistant.prototype.handleCommand = function(event) {
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
            case 'do-Preferences':
                var stageController = Mojo.Controller.stageController;
                stageController.pushScene({ name: "preferences", disableSceneScroller: false });
                break;
            case 'do-myAbout':
                Mojo.Additions.ShowDialogBox("Podcast Directory - " + Mojo.Controller.appInfo.version, "Retro Podcast Directory client for webOS. Copyright 2022, webOS Archive. Distributed under a MIT License, and powered by PodcastIndex.org.<br>Source code available at: https://github.com/webosarchive/webos-podcastdirectory");
                break;
        }
    }
};

//Handles the enter key
MainAssistant.prototype.handleKeyUp = function(event) {

    if (event && Mojo.Char.isEnterKey(event.keyCode)) {
        if (event.srcElement.parentElement.id == "txtSearch") {
            this.handleClick(event);
        }
    }
};

//Handle mojo button taps
MainAssistant.prototype.handleClick = function(event) {

    this.disableUI();

    //figure out what was requested
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    if (stageController) {
        this.controller = stageController.activeScene();
        var searchRequest = $("txtSearch").mojo.getValue();
        if (searchRequest && searchRequest != "") {
            appModel.LastSearchString = searchRequest;
            this.searchPodcasts(searchRequest);
        } else {
            this.enableUI();
            setTimeout("$('txtSearch').mojo.focus();", 100);
        }
    }
}

//Handle non-mojo button taps
this.cancelDownload = false;
MainAssistant.prototype.handleClearTap = function() {

    //Tell any downloads to cancel
    this.cancelDownload = true;

    //Clear the text box
    $("txtSearch").mojo.setValue("");

    //Uncheck all items in list
    var listWidgetSetup = this.controller.getWidgetSetup("searchResultsList");
    for (var i = 0; i < listWidgetSetup.model.items.length; i++) {
        listWidgetSetup.model.items[i].selectedState = false;
    }
    //Hide List
    $("showResultsList").style.display = "none";

    this.enableUI();
    this.getUserRecommendations();
    $("txtSearch").mojo.focus();
}

//Handle list item taps
MainAssistant.prototype.handleListClick = function(event) {
    Mojo.Log.info("Item tapped: " + event.item.title + ", id: " + event.item.id);

    Mojo.Log.info("Item details: " + JSON.stringify(event.item.data));
    appModel.LastPodcastSelected = event.item.data;
    var stageController = Mojo.Controller.stageController;
    stageController.pushScene({ transition: Mojo.Transition.crossFade, name: "detail" });

    return false;
}

MainAssistant.prototype.getUserRecommendations = function() {
    Mojo.Log.info("Getting User Recommendations from Sharing Service...");
    this.controller.get('spinnerLoad').mojo.start();
    $("spnResultsTitle").innerHTML = "Recommended by webOS Users";
    shareServiceModel.DoShareListRequest(function(response) {
        this.controller.get('spinnerLoad').mojo.stop();
        Mojo.Log.info(response);
        try {
            var responseObj = JSON.parse(response);
            if (responseObj.shares) {
                var sharedItems = [];
                for (var i = 0; i < responseObj.shares.length; i++) {
                    Mojo.Log.info("shared item: " + JSON.stringify(responseObj.shares[i]));
                    if (responseObj.shares[i].content)
                        sharedItems.push(responseObj.shares[i].content)
                }
                this.updateSearchResultsList(sharedItems);
            } else {
                throw ("No items shared");
            }
        } catch (ex) {
            Mojo.Log.warn("Shared recommendation list was empty or could not be loaded: " + ex);
        }
    }.bind(this));
}

//Send a search request to Podcast Directory
MainAssistant.prototype.searchPodcasts = function(searchRequest) {
    $("spnResultsTitle").innerHTML = "Search Results";
    this.controller.get('spinnerLoad').mojo.start();
    Mojo.Log.info("Search requested: " + searchRequest + ", Max: " + appModel.AppSettingsCurrent["SearchResultMax"]);
    this.SearchValue = searchRequest;
    serviceModel.DoPodcastSearchRequest(searchRequest, appModel.AppSettingsCurrent["SearchResultMax"], function(response) {
        this.controller.get('spinnerLoad').mojo.stop();
        Mojo.Log.info("ready to process search results: " + response);
        if (response != null && response != "") {
            var responseObj = JSON.parse(response);
            if (responseObj.status == "error") {
                Mojo.Log.error("Error message from server while searching for Podcasts: " + responseObj.msg);
                Mojo.Additions.ShowDialogBox("Server Error", "The server responded to the search request with: " + responseObj.msg.replace("ERROR: ", ""));
            } else {
                if (responseObj.feeds && responseObj.feeds.length > 0) {
                    //If we got a good looking response, remember it, and update the UI
                    appModel.LastSearchResult = responseObj.feeds;
                    this.updateSearchResultsList(responseObj.feeds);
                } else {
                    Mojo.Log.warn("Search results were empty. Either there was no matching result, or there were server or connectivity problems.");
                    Mojo.Additions.ShowDialogBox("No results", "The server did not report any matches for the search.");
                }
            }
        } else {
            Mojo.Log.error("No usable response from server while searching for Podcasts: " + response);
            Mojo.Additions.ShowDialogBox("Server Error", "The server did not answer with a usable response to the search request. Check network connectivity and/or self-host settings.");
        }

        this.enableUI();
    }.bind(this));
}

//Update the UI with search results from Search Request
MainAssistant.prototype.updateSearchResultsList = function(results) {

    var thisWidgetSetup = this.controller.getWidgetSetup("searchResultsList");
    thisWidgetSetup.model.items = []; //remove the previous list
    for (var i = 0; i < results.length; i++) {

        var newItem = {
            id: results[i].id,
            title: results[i].title,
            description: results[i].description,
            data: results[i]
        };
        thisWidgetSetup.model.items.push(newItem);
    }

    Mojo.Log.info("Updating search results widget with " + results.length + " results!");
    $("showResultsList").style.display = "block";
    this.controller.modelChanged(thisWidgetSetup.model);
}

MainAssistant.prototype.disableUI = function(statusValue) {
    //start spinner
    /*if (!this.spinnerModel.spinning) {
        this.spinnerModel.spinning = true;
        this.controller.modelChanged(this.spinnerModel);
    }*/

    if (statusValue && statusValue != "") {
        $("divWorkingStatus").style.display = "block";
        $("divStatusValue").innerHTML = statusValue;
    } else {
        $("divWorkingStatus").style.display = "none";
    }

    //disable submit button
    if (!this.submitBtnModel.disabled) {
        this.submitBtnModel.disabled = true;
        this.controller.modelChanged(this.submitBtnModel);
    }

    $("showResultsList").style.display = "none";
}

MainAssistant.prototype.enableUI = function() {
    //stop spinner
    /*
    this.spinnerModel.spinning = false;
    this.controller.modelChanged(this.spinnerModel);
    */

    //hide status
    $("divWorkingStatus").style.display = "none";
    $("divStatusValue").innerHTML = "";

    //enable submit button
    this.submitBtnModel.disabled = false;
    this.controller.modelChanged(this.submitBtnModel);
}

MainAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
    Mojo.Event.stopListening(this.controller.get("btnGet"), Mojo.Event.tap, this.handleClick);
    Mojo.Event.stopListening(this.controller.get("searchResultsList"), Mojo.Event.listTap, this.handleListClick);
    // Non-Mojo widgets
    $("btnClear").removeEventListener("click", this.handleClearTap);
    this.controller.document.removeEventListener("keyup", this.keyupHandler);
};

MainAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
       a result of being popped off the scene stack */
};