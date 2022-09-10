/*
In the app assistant, we setup some app-wide global objects and handle different kinds of launches, creating and delegating to the main stage
*/
var appModel = null;
var updaterModel = null;
var serviceModel = null;
var shareServiceModel = null;

function AppAssistant() {
    appModel = new AppModel();
    updaterModel = new UpdaterModel();
    serviceModel = new ServiceModel();
    shareServiceModel = new ShareServiceModel();
    Mojo.Additions = Additions;
}

//This function will handle relaunching the app when an alarm goes off(see the device/alarm scene)
AppAssistant.prototype.handleLaunch = function(params) {
    Mojo.Log.info("Podcast Directory is Launching! Launch params: " + JSON.stringify(params));

    //load preferences
    appModel.LoadSettings();
    Mojo.Log.info("settings now: " + JSON.stringify(appModel.AppSettingsCurrent));

    //get the proxy for the stage in the event it already exists (eg: app is currently open)
    var mainStage = this.controller.getStageProxy("");
    
    //if there was a search query, load with that
    if (params && params["query"] != undefined) {
        appModel.LaunchQuery = decodeURI(params["query"]);
        Mojo.Log.info("Launch query was: " + appModel.LaunchQuery);
    }

    if (params["sendDataToShare"]) {
        Mojo.Log.info("Launch with Touch2Share request!");
		if (appModel.TouchToShareURL != null)
	        this.SendDataForTouch2Share(appModel.TouchToShareURL);
		else
			Mojo.Log.warn("Nothing to share...");
    }

    //if the stage already exists then just bring it into focus
    if (mainStage) {
        var stageController = this.controller.getStageController("");
        stageController.activate();
    }
    return;
};

AppAssistant.prototype.SendDataForTouch2Share = function(url, callback) {
    if (!url) {
        Mojo.Log.error("Share URL not supplied");
        return false;
    }
	if (callback)
        callback = callback.bind(this);
	var params = {data: { target: url, type: "rawdata", mimetype: "text/html" }};
	Mojo.Log.info("Touch2Share payload is ", JSON.stringify(params));

    this.shareRequest = new Mojo.Service.Request("palm://com.palm.stservice", {
        method: "shareData",
        parameters: params,
		subscribe: true,
        onSuccess: function(response) {
            Mojo.Log.info("Touch2Share Success!", JSON.stringify(response));
            if (callback) {
                callback(response);
                return true;
            }
        },
        onFailure: function(response) {
            Mojo.Log.error("Touch2Share Failure: ", JSON.stringify(response));
            if (callback) {
                callback(response);
                return false;
            }
        }
    });
    return true;
}