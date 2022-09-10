function PreferencesAssistant() {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
}

PreferencesAssistant.prototype.setup = function() {
    /* setup widgets here */

    //Theme picker
    this.controller.setupWidget("listThemePreference",
    {label: $L({value:"Theme", key:"theme"}),
        labelPlacement: Mojo.Widget.labelPlacementLeft,
        choices: [
            {label: $L({value:"Light", key:"themeLight"}), value: "palm-default"},
            {label: $L({value:"Dark", key:"themeDark"}), value: "palm-dark"},
            {label: $L({value:"System Pref", key:"themeSystem"}), value: "system-theme"}
        ]},
    { value: appModel.AppSettingsCurrent["ThemePreference"] });
    //Timeout picker
    this.controller.setupWidget("listShowmax",
        this.attributes = {
            label: $L("Tiny Max"),
            choices: [
                { label: "5 episodes", value: 5 },
                { label: "10 episodes", value: 10 },
                { label: "20 episodes", value: 20 },
                { label: "30 episodes", value: 30 }
            ]
        },
        this.model = {
            value: appModel.AppSettingsCurrent["ShowMax"],
            disabled: false
        }
    );
    //Search result picker
    this.controller.setupWidget("listSearchmax",
        this.attributes = {
            label: $L("Max Results"),
            choices: [
                { label: "10", value: 10 },
                { label: "25", value: 25 },
                { label: "50", value: 50 }
            ]
        },
        this.model = {
            value: appModel.AppSettingsCurrent["SearchResultMax"],
            disabled: false
        }
    );
    //Toggles
    this.controller.setupWidget("toggleCustomEndPoint",
        this.attributes = {
            trueValue: true,
            falseValue: false
        },
        this.model = {
            value: appModel.AppSettingsCurrent["UseCustomEndpoint"],
            disabled: false
        }
    );
    //Text fields
    this.controller.setupWidget("txtEndpointURL",
        this.attributes = {
            hintText: $L("http://your-podcast-server.com"),
            multiline: false,
            enterSubmits: false,
            autoReplace: false,
            textCase: Mojo.Widget.steModeLowerCase
        },
        this.model = {
            value: appModel.AppSettingsCurrent["EndpointURL"],
            disabled: !appModel.AppSettingsCurrent["EndpointURL"]
        }
    );

    //OK Button
    this.controller.setupWidget("btnOK", { type: Mojo.Widget.activityButton }, { label: "Done", disabled: false });
    //Menu
    this.appMenuAttributes = { omitDefaultItems: true };
    this.appMenuModel = {
        label: "Settings",
        items: [
            Mojo.Menu.editItem,
            { label: "Reset Settings", command: 'do-resetSettings' }
        ]
    };
    this.controller.setupWidget(Mojo.Menu.appMenu, this.appMenuAttributes, this.appMenuModel);

    /* add event handlers to listen to events from widgets */
    Mojo.Event.listen(this.controller.get("listThemePreference"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("listShowmax"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("listSearchmax"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("txtEndpointURL"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("toggleCustomEndPoint"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("btnOK"), Mojo.Event.tap, this.okClick.bind(this));
};

PreferencesAssistant.prototype.activate = function(event) {
    /* put in event handlers here that should only be in effect when this scene is active. For
       example, key handlers that are observing the document */
    //this.showBetaFeatures();
};

PreferencesAssistant.prototype.showBetaFeatures = function() {
    //No beta features right now
}

PreferencesAssistant.prototype.handleValueChange = function(event) {
    Mojo.Log.error("HERE!!");
    Mojo.Log.error(event.srcElement.id + " value changed to " + event.value);
    switch (event.srcElement.id) {
        case "listThemePreference":
            appModel.AppSettingsCurrent["ThemePreference"] = event.value;
            appModel.SetThemePreference(this.controller);
            break;
        case "toggleCustomEndPoint":
            {
                var thisWidgetSetup = this.controller.getWidgetSetup("txtEndpointURL");
                thisWidgetSetup.model.disabled = !event.value;
                this.controller.modelChanged(thisWidgetSetup.model);
                if (event.value)
                    this.controller.get('txtEndpointURL').mojo.focus();
                break;
            }
        case "txtEndpointURL":
            var lastChar = event.value[event.value.length - 1]
            if (lastChar != "/") {
                event.value = event.value + "/";
                Mojo.Log.warn("Custom end point URL was missing trailing slash, it has been added. Value is now: " + event.value);
            }
            break;
    }

    //We stashed the preference name in the title of the HTML element, so we don't have to use a case statement
    Mojo.Log.info(event.srcElement.title + " now: " + event.value);
    appModel.AppSettingsCurrent[event.srcElement.title] = event.value;
    appModel.SaveSettings();
};

//Handle menu and button bar commands
PreferencesAssistant.prototype.handleCommand = function(event) {
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
            case 'do-goBack':
                Mojo.Controller.stageController.popScene();
                break;
            case 'do-resetSettings':
                appModel.ResetSettings(appModel.AppSettingsDefaults);
                break;
        }
    }
};

PreferencesAssistant.prototype.okClick = function(event) {
    Mojo.Controller.stageController.popScene();
}

PreferencesAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
    Mojo.Event.stopListening(this.controller.get("listThemePreference"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("listSearchmax"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("listShowmax"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("txtEndpointURL"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("toggleCustomEndPoint"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("btnOK"), Mojo.Event.tap, this.okClick.bind(this));
};

PreferencesAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */

};