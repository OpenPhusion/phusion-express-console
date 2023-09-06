
var svc = {
    _baseUrl: "/service/v1",
    _token: null,

    _addTokenHeader: function(xhr) {
        if (this._token) {
            xhr.setRequestHeader("X-Phusion-Token", this._token);
        }
    },

    setToken: function(token) {
        this._token = token;
    },

    post: function(url, data, callback) {
        return svc._call("POST", url, data, callback);
    },

    put: function(url, data, callback) {
        return svc._call("PUT", url, data, callback);
    },

    delete: function(url, callback) {
        return svc._call("DELETE", url, null, callback);
    },

    postFile: function(url, data, callback) {
        var xhr = new XMLHttpRequest();
        
        xhr.open('POST', this._baseUrl + url, true);
        this._addTokenHeader(xhr);

        xhr.onload = function() {
            svc._callHandler(xhr, callback);
        }

        xhr.send(data);
    },

    _call: function(method, url, data, callback) {
        var xhr = new XMLHttpRequest();
        var isAsync = callback != null;

        xhr.open(method, this._baseUrl + url, isAsync);
        xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        this._addTokenHeader(xhr);

        if (isAsync) {
            xhr.onload = function() {
                svc._callHandler(xhr, callback);
            }
        }

        xhr.send(data && (typeof data === 'object') ? JSON.stringify(data) : data);

        if (! isAsync) {
            return svc._callHandler(xhr);
        }
    },

    _callHandler: function(xhr, callback, noAlert) {
        if (xhr.status === 200) {
            var response = xhr.responseText;
            var contentType = xhr.getResponseHeader("Content-Type");
            if (contentType && contentType.indexOf("application/json") >= 0) {
                response = JSON.parse(response);
                if (ui.handleServiceError(response, noAlert)) {
                    if (callback) callback(response);
                    else return response;
                }
                else {
                    if (! callback) return null;
                    if (noAlert) callback(null);
                }
            }
            else {
                if (callback) callback(response);
                else return response;
            }
        } else {
            ui.handleServiceError(null, noAlert);
            if (! callback) return null;
        }
    },

    get: function(url, callback, noAlert) {
        var xhr = new XMLHttpRequest();
        var isAsync = callback != null;

        xhr.open("GET", this._baseUrl + url, isAsync);
        this._addTokenHeader(xhr);

        if (isAsync) {
            xhr.onload = function() {
                svc._callHandler(xhr, callback, noAlert);
            }
        }

        xhr.send();

        if (! isAsync) {
            return svc._callHandler(xhr, null, noAlert);
        }
    }
};

var ui = {
    _currentTab: null,
    _currentTabType: null,

    _onSelectTab: function(event) {
        var el = event.target;
        ui.selectTab(el);
    },

    composeStatusBox: function(status, msg) {
        if (! msg) {
            switch (status) {
                case "error":
                    msg = "Error";
                    break;
                case "running":
                    msg = "Running";
                    break;
                case "connected":
                    msg = "Connected";
                    status = "running";
                    break;
                case "stopped":
                    msg = "Stopped";
                    break;
                case "unconnected":
                    msg = "Unconnected";
                    status = "stopped";
                    break;
                case "unused":
                    msg = "Unused";
                    break;
            }
        }

        return '<span class="status-box ' + status + '" title="' + msg + '"></span>';
    },

    composeTransactionStatusBox: function(finished, failed) {
        var status = failed ? 'failed' : (finished ? 'finished' : 'running');
        var msg = failed ? 'Failed' : (finished ? 'Finished' : 'Running...');
        return '<span class="status-trx trx-' + status + '">' + msg + '</span>';
    },

    composeYesBox: function(yes) {
        return yes ? '<i class="fas fa-check" title="Yes"></i>' : '';
    },

    composeOperations: function(type, obj) {
        if (type === "protocol" || type === "template") obj.status = null;

        var html = [];
        html.push('<a href="#" onclick="detail.show(\'' + type + '\',\'' + obj.id + '\',this)">show</a>');

        switch (obj.status) {
            case "unused":
                var title = type==="connection" ? "connect" : "start";
                html.push('<a href="#" onclick="detail.start(\'' + type + '\',\'' + obj.id + '\',this)">'+title+'</a>');
                break;
            case "running":
                html.push('<a href="#" onclick="detail.stop(\'' + type + '\',\'' + obj.id + '\',this)">stop</a>');
                html.push('<a href="#" onclick="detail.restart(\'' + type + '\',\'' + obj.id + '\',this)">restart</a>');
                break;
            case "connected":
                html.push('<a href="#" onclick="detail.stop(\'' + type + '\',\'' + obj.id + '\',this)">disconnect</a>');
                break;
            case "stopped":
                html.push('<a href="#" onclick="detail.start(\'' + type + '\',\'' + obj.id + '\',this)">start</a>');
                html.push('<a href="#" onclick="detail.restart(\'' + type + '\',\'' + obj.id + '\',this)">restart</a>');
                break;
            case "unconnected":
                html.push('<a href="#" onclick="detail.start(\'' + type + '\',\'' + obj.id + '\',this)">connect</a>');
                break;
        }

        if (type === "integration") {
            html.push('<a href="javascript:detail.getTransactions(\'' + type + '\',\'' + obj.id + '\')">transactions</a>');
        }

        if (type === "user") {
            if (app.myselfUserId && obj.id == app.myselfUserId) {
                html.push('<span class="myself">me</span>');
            }
        }

        return html.join("");
    },

    _tabs: {
        "transactions": 4
    },

    selectTab: function(tabEl) {
        if (typeof(tabEl) === "string") {
            tabEl = document.getElementById("screen-console").getElementsByClassName("tab")[ui._tabs[tabEl]];
        }

        var elType = tabEl.getAttribute("type");

        if (elType === ui._currentTabType) return;

        if (ui._currentTab) {
            ui._currentTab.classList.remove("selected");
            document.getElementById("panel-" + ui._currentTabType).style.display = "none";
        }

        tabEl.classList.add("selected");
        panel.show(elType);

        ui._currentTab = tabEl;
        ui._currentTabType = elType;
    },

    refresh: function() {
        if (ui._currentTab) {
            panel.refresh(ui._currentTabType);
        }
    },

    newWindow: function() {
        var url = window.location.href;
        if (url.indexOf("?") < 0) {
            url += "?token=" + svc._token;
        }
        window.open(url, "_blank");
    },

    handleServiceError: function(response, noAlert) {
        if (response == null) {
            if (! noAlert) alert("Error calling service");
            return false;
        }

        if (response.error) {
            var err = response.error;
            var msg = err.msg;
            if (err.data && err.data.exception) msg += ":\n" + err.data.exception;

            if (! noAlert) alert(msg);
            return false;
        }

        return true;
    },

    init: function() {
        document.getElementById("loginBtn").addEventListener("click", app.login);
        document.getElementById("btn-refresh").addEventListener("click", ui.refresh);
        document.getElementById("btn-window").addEventListener("click", ui.newWindow);
    },

    _firstPanel: 0,

    showConsole: function() {
        document.getElementById("screen-login").style.display = "none";
        document.getElementById("screen-console").style.display = "";

        var els = document.getElementsByClassName("console-tabs")[0].getElementsByClassName("tab");
        for (var i = 0; i < els.length; i++) {
            els[i].addEventListener("click", ui._onSelectTab);

            if (i === ui._firstPanel) ui.selectTab(els[i]);
        }
    },

    clearInput: function(event) {
        var el = event.target;
        if (el.innerText === "-") el.innerText = "";
    }
};

var panel = {
    _initialized: {},

    _init: function(panelEl, panelName) {
        switch (panelName) {
            case "engines":
                app.listEngines(panel.showEngines);
                break;
            case "applications":
                app.listApplications(false, panel.showApplications);
                break;
            case "protocols":
                app.listApplications(true, panel.showProtocols);
                break;
            case "clients":
                app.listClients(panel.showClients);
                break;
            case "connections":
                app.listConnections(panel.showConnections);
                break;
            case "integrations":
                app.listIntegrations(false, panel.showIntegrations);
                break;
            case "templates":
                app.listIntegrations(true, panel.showTemplates);
                break;
            case "transactions":
                app.listTransactions(app.query.transaction.integration, app.query.transaction.keyword, panel.showTransactions);
                break;
            case "users":
                app.listUsers(panel.showUsers);
                break;
            default:
                panelEl.innerText = panelName;
        }

        panel._initialized[panelName] = true;
    },

    _composeListTable: function(header, rows, showCreateButton) {
        var html = [];

        html.push('<table class="list-table">');

        html.push('<tr class="list-header">');
        for (var i = 0; i < header.length; i++) {
            html.push('<td class="list-cell">');
            html.push(header[i]);
            html.push('</td>');
        }
        html.push('</tr>');

        if (rows && rows.length > 0) {
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];

                html.push('<tr class="list-row">');
                for (var j = 0; j < row.length; j++) {
                    html.push('<td class="list-cell">');
                    html.push(row[j]);
                    html.push('</td>');
                }
                html.push('</tr>');
            }
        }

        if (showCreateButton) {
            var objType = showCreateButton.charAt(0).toUpperCase() + showCreateButton.slice(1);

            html.push('<tr class="list-row">');
            html.push('<td class="list-cell button-cell" colspan="' + header.length + '">');
            html.push('<a href="javascript:detail.create(\''+showCreateButton+'\')">Create '+objType+'</a>');
            html.push('</td>');
            html.push('</tr>');
        } else {
            html.push('<tr class="list-row">');
            html.push('<td class="list-cell" colspan="' + header.length + '">&nbsp;</td>');
            html.push('</tr>');
        }

        html.push('</table>');

        return html.join("");
    },

    show: function(panelName) {
        var el = document.getElementById("panel-" + panelName);
        if (! panel._initialized[panelName]) panel._init(el, panelName);

        el.style.display = "";
    },

    reset: function(panelName) {
        panel._initialized[panelName] = false;
    },

    refresh: function(panelName) {
        var el = document.getElementById("panel-" + panelName);
        panel._init(el, panelName);
    },

    showEngines: function(data) {
        var el = document.getElementById("panel-engines");
        
        var rows = [];
        var expireInterval = data.result.heartbeatExpireInterval;
        var engines = data.result.activeEngines;

        if (engines && engines.length > 0) {
            for (var i = 0; i < engines.length; i++) {
                var engine = engines[i];

                rows.push([
                    engine.engineId,
                    engine.address,
                    engine.lastHeartbeatTime,
                    ui.composeStatusBox( app.isEngineAlive(engine.lastHeartbeatTime, expireInterval) ? "running" : "error")
                ]);
            }
        }

        el.innerHTML = panel._composeListTable(
            ["Engine ID", "Local Address", "Last Heartbeat", "Status"],
            rows
        );
    },

    deleteRow: function(type, id, elDelLink) {
        var elDetailRow = elDelLink.parentElement.parentElement.parentElement;

        if (confirm("Are you sure to delete "+type+" "+id+"?")) {
            app.deleteObject(type, id, function(response) {
                elDetailRow.parentElement.removeChild(elDetailRow.previousElementSibling);
                elDetailRow.parentElement.removeChild(elDetailRow);
            });
        }
    },

    _newRow: function(type, row) {
        var el = document.getElementById("panel-"+type+"s");
        var firstRow = el.getElementsByClassName("list-header")[0];

        var newRow = document.createElement("tr");
        newRow.className = "list-row";

        var html = [];
        for (var i = 0; i < row.length; i++) {
            html.push('<td class="list-cell">');
            html.push(row[i]);
            html.push('</td>');
        }

        newRow.innerHTML = html.join("");
        
        firstRow.parentElement.insertBefore(newRow, firstRow.nextSibling);

        el.scrollIntoView();
    },

    newObject: function(type, id, data) {
        var currentTime = app.getCurrentTimeStr();
        
        var obj = {"id": id};
        var row;

        switch (type) {
            case "application":
                obj.status = "unused";

                row = [
                    id,
                    "",
                    "",
                    "",
                    currentTime,
                    currentTime,
                    ui.composeStatusBox(obj.status),
                    ui.composeOperations(type, obj)
                ];
                break;
            case "connection":
                obj.status = "unused";

                row = [
                    id,
                    data.applicationId,
                    data.clientId,
                    currentTime,
                    currentTime,
                    ui.composeStatusBox(obj.status),
                    ui.composeOperations(type, obj)
                ];
                break;
            case "integration":
                obj.status = "unused";

                row = [
                    id,
                    "",
                    "",
                    currentTime,
                    currentTime,
                    ui.composeStatusBox(obj.status),
                    ui.composeOperations(type, obj)
                ];
                break;
            case "client":
            case "protocol":
            case "user":
            case "template":
                row = [
                    id,
                    "",
                    "",
                    currentTime,
                    currentTime,
                    ui.composeOperations(type, obj)
                ];
                break;
        }

        panel._newRow(type, row);
    },

    showApplications: function(data) {
        var el = document.getElementById("panel-applications");

        var rows = [];
        var applications = data.result;

        if (applications && applications.length > 0) {
            for (var i = 0; i < applications.length; i++) {
                var application = applications[i];
                rows.push([
                    application.id,
                    application.title,
                    application.desc,
                    ui.composeYesBox(application.autoStart),
                    application.createTime,
                    application.updateTime,
                    ui.composeStatusBox(application.status),
                    ui.composeOperations("application", application)
                ]);
            }
        }

        el.innerHTML = panel._composeListTable(
            ["Application ID", "Title", "Description", "Auto Start", "Created", "Last Updated", "Status", "&nbsp;Operations"],
            rows,
            "application"
        );
    },

    showProtocols: function(data) {
        var el = document.getElementById("panel-protocols");

        var rows = [];
        var protocols = data.result;

        if (protocols && protocols.length > 0) {
            for (var i = 0; i < protocols.length; i++) {
                var protocol = protocols[i];
                rows.push([
                    protocol.id,
                    protocol.title,
                    protocol.desc,
                    protocol.createTime,
                    protocol.updateTime,
                    ui.composeOperations("protocol", protocol)
                ]);
            }
        }

        el.innerHTML = panel._composeListTable(
            ["Protocol ID", "Title", "Description", "Created", "Last Updated", "&nbsp;Operations"],
            rows,
            "protocol"
        );
    },

    showClients: function(data) {
        var el = document.getElementById("panel-clients");

        var rows = [];
        var clients = data.result;

        if (clients && clients.length > 0) {
            for (var i = 0; i < clients.length; i++) {
                var client = clients[i];
                rows.push([
                    client.id,
                    client.title,
                    client.desc,
                    client.createTime,
                    client.updateTime,
                    ui.composeOperations("client", client)
                ]);
            }
        }

        el.innerHTML = panel._composeListTable(
            ["Client ID", "Title", "Description", "Created", "Last Updated", "&nbsp;Operations"],
            rows,
            "client"
        );
    },

    showConnections: function(data) {
        var el = document.getElementById("panel-connections");

        var rows = [];
        var connections = data.result;

        if (connections && connections.length > 0) {
            for (var i = 0; i < connections.length; i++) {
                var connection = connections[i];
                rows.push([
                    connection.id,
                    connection.applicationId,
                    connection.clientId,
                    connection.createTime,
                    connection.updateTime,
                    ui.composeStatusBox(connection.status),
                    ui.composeOperations("connection", connection)
                ]);
            }
        }

        el.innerHTML = panel._composeListTable(
            ["Connection ID", "Application", "Client", "Created", "Last Updated", "Status", "&nbsp;Operations"],
            rows,
            "connection"
        );
    },

    showIntegrations: function(data) {
        var el = document.getElementById("panel-integrations");

        var rows = [];
        var integrations = data.result;

        if (integrations && integrations.length > 0) {
            for (var i = 0; i < integrations.length; i++) {
                var integration = integrations[i];
                rows.push([
                    integration.id,
                    integration.title,
                    ui.composeYesBox(integration.autoStart),
                    integration.createTime,
                    integration.updateTime,
                    ui.composeStatusBox(integration.status),
                    ui.composeOperations("integration", integration)
                ]);
            }
        }

        el.innerHTML = panel._composeListTable(
            ["Integration ID", "Title", "Auto Start", "Created", "Last Updated", "Status", "&nbsp;Operations"],
            rows,
            "integration"
        );
    },

    showTemplates: function(data) {
        var el = document.getElementById("panel-templates");

        var rows = [];
        var templates = data.result;

        if (templates && templates.length > 0) {
            for (var i = 0; i < templates.length; i++) {
                var template = templates[i];
                rows.push([
                    template.id,
                    template.title,
                    template.desc,
                    template.createTime,
                    template.updateTime,
                    ui.composeOperations("template", template)
                ]);
            }
        }

        el.innerHTML = panel._composeListTable(
            ["Template ID", "Title", "Description", "Created", "Last Updated", "&nbsp;Operations"],
            rows,
            "template"
        );
    },

    showTransactions: function(data) {
        var el = document.getElementById("panel-transactions");

        var rows = [];
        var transactions = data.result;

        if (transactions && transactions.length > 0) {
            for (var i = 0; i < transactions.length; i++) {
                var transaction = transactions[i];
                rows.push([
                    transaction.id,
                    transaction.integrationId,
                    transaction.startTime,
                    Math.round(transaction.duration)/1000.0,
                    transaction.engineId,
                    ui.composeTransactionStatusBox(transaction.finished, transaction.failed),
                    ui.composeOperations("transaction", transaction)
                ]);
            }
        }

        el.innerHTML = panel._composeTransactionQuery() + 
        panel._composeListTable(
            ["Transaction ID", "Integration", "Start Time", "Duration", "Engine", "Status", "&nbsp;Operations"],
            rows
        );
    },

    showUsers: function(data) {
        var el = document.getElementById("panel-users");

        var rows = [];
        var users = data.result;

        if (users && users.length > 0) {
            for (var i = 0; i < users.length; i++) {
                var user = users[i];
                user.admin = app.isAdmin(user);

                rows.push([
                    user.id,
                    user.name,
                    ui.composeYesBox(user.admin),
                    user.createTime,
                    user.updateTime,
                    ui.composeOperations("user", user)
                ]);
            }
        }

        el.innerHTML = panel._composeListTable(
            ["User ID", "Name", "Is Admin", "Created", "Last Updated", "&nbsp;Operations"],
            rows,
            "user"
        );
    },

    _composeTransactionQuery: function() {
        var html = [];
        var integration = app.query.transaction.integration;
        var keyword = app.query.transaction.keyword;

        html.push("<div class='list-query'>");

        html.push("<span class='key'>Integration:</span>");
        html.push("<span class='value'>");
        html.push("<span contenteditable onclick='ui.clearInput(event)' onkeydown='panel.submitQueryText(\"transaction\",\"integration\",event)'>");
        html.push(integration ? integration : "-");
        html.push("</span>");
        if (integration) html.push(" <i class='fas fa-times-circle' onclick='panel.doQuery(\"transaction\",\"integration\")'></i>");
        html.push("</span>");

        html.push("<span class='key'>Search:</span>");
        html.push("<span class='value'>");
        html.push("<span contenteditable onclick='ui.clearInput(event)' onkeydown='panel.submitQueryText(\"transaction\",\"keyword\",event)'>");
        html.push(keyword ? keyword : "-");
        html.push("</span>");
        if (keyword) html.push(" <i class='fas fa-times-circle' onclick='panel.doQuery(\"transaction\",\"keyword\")'></i>");
        html.push("</span>");

        html.push("<span class='key'>Max Range:</span>");
        html.push("<span class='text'>3 days 100 rows</span>");
        html.push("</div>");

        return html.join("");
    },

    doQuery: function(type, key, value) {
        if (! value) value = null;
        app.query[type][key] = value;

        // The keyword MUST be used with an integration ID

        if (! value && type == "transaction" && key == "integration")
            app.query.transaction.keyword = null;

        if (value && type == "transaction" && key == "keyword" && ! app.query.transaction.integration) {
            alert("Please specify the integration ID first!");
            return;
        }

        ui.refresh();
    },

    submitQueryText: function(type, key, event) {
        var value = event.target.innerText.trim();
        if (value == "-" || value == "") value = null;

        if (event.keyCode == 13) {
            event.preventDefault();
            panel.doQuery(type, key, value);
        }
        else {
            app.query[type][key] = value;
        }
    }
}

var detail = {
    show: function(type, id, el, isInDetailPanel) {
        if (isInDetailPanel) {
            var tds = el.parentElement.parentElement.parentElement.previousElementSibling.getElementsByTagName("TD");
            el = tds[tds.length-1].getElementsByTagName("A")[0];
        }

        if (el.innerText === "show") {
            el.innerText = "hide";
            detail._hideOperations(el); // Because the operations are conflicting with the detail panel, so hide them

            var elRow = detail._getRow(el);
            var elDetailRow = document.createElement("tr");

            elDetailRow.id = "detail-"+id;
            elDetailRow.className = "list-row";

            var wider = (type==="protocol" || type==="template" || type==="user") ? " wider" : 
                            ((type==="connection" || type==="client") ? " middle" : "");
            elDetailRow.innerHTML = '<td class="list-cell detail-cell'+wider+'" colspan="' + elRow.children.length + '"></td>';

            app.getObject(type, id, function(response) {
                if (type === "user") {
                    response.result.admin = app.isAdmin(response.result);
                }

                detail._renderObject(type, id, response.result, elDetailRow.getElementsByTagName("td")[0]);
                elRow.parentElement.insertBefore(elDetailRow, elRow.nextSibling);

                if (! response.result) return;

                var cache = detail._originalDataCache;
                switch (type) {
                    case "application":
                        cache.applicationEndPoints[id] = response.result.endpoints;
                        cache.applicationTables[id] = response.result.tables;
                        break;
                    case "protocol":
                        cache.protocolEndPoints[id] = response.result.endpoints;
                        break;
                    case "client":
                        cache.clientTables[id] = response.result.tables;
                        break;
                    case "integration":
                        cache.integrationTables[id] = response.result.tables;
                        break;
                }
            });
        }
        else {
            el.innerText = "show";
            detail._showOperations(el);

            var elRow = detail._getRow(el);

            if (elRow.nextSibling && elRow.nextSibling.id.indexOf("detail-") == 0) {
                elRow.parentElement.removeChild(elRow.nextSibling);
                
                var cache = detail._originalDataCache;
                switch (type) {
                    case "application":
                        delete cache.applicationEndPoints[id];
                        delete cache.applicationTables[id];
                        break;
                    case "protocol":
                        delete cache.protocolEndPoints[id];
                        break;
                    case "client":
                        delete cache.clientTables[id];
                        break;
                    case "integration":
                        delete cache.integrationTables[id];
                        break;
                }
            }
        }
    },

    _hideOperations: function(el) {
        this._showOperations(el, true);
    },

    _operations: {"start":true, "stop":true, "restart":true, "connect":true, "disconnect":true},

    _showOperations: function(el, hiding) {
        var operations = el.parentElement.getElementsByTagName('A');
        for (var i = 0; i<operations.length; i++) {
            if (detail._operations[operations[i].innerText]) {
                operations[i].style.display = hiding ? "none" : "";
            }
        }
    },

    _detailStructure: {
        application: [
            {name:"id", title:"ID"},
            {name:"title", title:"Title", editable:true},
            {name:"desc", title:"Description", editable:true},
            {name:"status", title:"Status", type:"status"},
            {name:"autoStart", title:"Auto Start", type:"boolean", editable:true},
            {name:"protocols", title:"Protocols", type:"data", editable:true},
            {name:"code", title:"Code", type:"data", editable:true},
            {name:"config", title:"Config", type:"data", editable:true},
            {name:"configSchema", title:"Schema of Config", type:"data", editable:true},
            {name:"connectionConfigSchema", title:"Schema of Connection Config", type:"data", editable:true},
            {name:"endpoints", title:"Endpoints", type:"datalist", editable:true},
            {name:"tables", title:"Tables", type:"datalist", editable:true},
            {name:"createTime", title:"Create Time"},
            {name:"updateTime", title:"Update Time"}
        ],

        protocol: [
            {name:"id", title:"ID"},
            {name:"title", title:"Title", editable:true},
            {name:"desc", title:"Description", editable:true},
            {name:"endpoints", title:"Endpoints", type:"datalist", editable:true},
            {name:"createTime", title:"Create Time"},
            {name:"updateTime", title:"Update Time"}
        ],
        
        client: [
            {name:"id", title:"ID"},
            {name:"title", title:"Title", editable:true},
            {name:"desc", title:"Description", editable:true},
            {name:"tables", title:"Tables", type:"datalist", editable:true},
            {name:"createTime", title:"Create Time"},
            {name:"updateTime", title:"Update Time"}
        ],
        
        connection: [
            {name:"id", title:"ID"},
            {name:"applicationId", title:"Application"},
            {name:"clientId", title:"Client"},
            {name:"status", title:"Status", type:"status"},
            {name:"config", title:"Config", type:"data", editable:true},
            {name:"createTime", title:"Create Time"},
            {name:"updateTime", title:"Update Time"}
        ],
        
        transaction: [
            {name:"id", title:"ID"},
            {name:"integrationId", title:"Integration"},
            {name:"engineId", title:"Engine"},
            {name:"finished", title:"Finished", type:"boolean"},
            {name:"failed", title:"Failed", type:"boolean"},
            {name:"startTime", title:"Start Time"},
            {name:"duration", title:"Duration (seconds)"},
            {name:"config", title:"Integration Config", type:"data"},
            {name:"steps", title:"Steps", type:"datalist"}
        ],
        
        integration: [
            {name:"id", title:"ID"},
            {name:"title", title:"Title", editable:true},
            {name:"desc", title:"Description", editable:true},
            {name:"clientId", title:"Client", editable:true},
            {name:"status", title:"Status", type:"status"},
            {name:"autoStart", title:"Auto Start", type:"boolean", editable:true},
            {name:"applications", title:"Applications", type:"data", editable:true},
            {name:"template", title:"Template", editable:true},
            {name:"config", title:"Config", type:"data", editable:true},
            {name:"configSchema", title:"Schema of Config", type:"data", editable:true},
            {name:"startCondition", title:"Start Condition", type:"data", editable:true},
            {name:"timer", title:"Trigger Timer", type:"data", editable:true},
            {name:"workflow", title:"Workflow", type:"data", editable:true},
            {name:"tables", title:"Tables", type:"datalist", editable:true},
            {name:"code", title:"Code", editable:true},
            {name:"createTime", title:"Create Time"},
            {name:"updateTime", title:"Update Time"}
        ],
        
        template: [
            {name:"id", title:"ID"},
            {name:"title", title:"Title", editable:true},
            {name:"desc", title:"Description", editable:true},
            {name:"configSchema", title:"Schema of Config", type:"data", editable:true},
            {name:"startCondition", title:"Start Condition", type:"data", editable:true},
            {name:"timer", title:"Trigger Timer", type:"data", editable:true},
            {name:"workflow", title:"Workflow", type:"data", editable:true},
            {name:"code", title:"Code", editable:true},
            {name:"createTime", title:"Create Time"},
            {name:"updateTime", title:"Update Time"}
        ],
        
        user: [
            {name:"id", title:"ID"},
            {name:"name", title:"Name", editable:true},
            {name:"admin", title:"Is Admin", type:"boolean", editable:true},
            {name:"password", title:"Password", type:"password", editable:true},
            {name:"createTime", title:"Create Time"},
            {name:"updateTime", title:"Update Time"}
        ]
    },

    _renderObject: function(type, id, data, el) {
        var list = detail._detailStructure[type];
        var html = [];

        var executable = type === "template" || type === "integration";

        // Create HTML elements

        for (var i = 0; i < list.length; i++) {
            var fieldId = list[i].name;
            var fieldTitle = list[i].title;
            var fieldType = list[i].type;

            html.push('<div class="field-title">');
            html.push('<div class="field-value">');
            html.push(fieldTitle);
            html.push('</div>');
            html.push('</div>');
            
            html.push('<div class="field-content">');
            if (fieldType === "datalist") {
                var datalist = data[fieldId];
                var len = datalist ? datalist.length : 0;
                for (var j = 0; j < len; j++) {
                    if (j > 0) html.push('<hr>');
                    // html.push('<div class="field-value" id="');
                    // html.push(id+'-'+fieldId+'-'+j);
                    // html.push('"></div>');
                    html.push('<div class="field-value"></div>');
                }

                if (list[i].editable) {
                    html.push('<a href="#" id="'+id+'-'+fieldId+'" onclick="detail.newDataItem(this)" style="display:none">add</a>');
                }
            }
            else {
                html.push('<div class="field-value" id="');
                html.push(id+'-'+fieldId);
                html.push('"></div>');

                if (executable) {
                    if (fieldId === 'workflow') {
                        html.push('<a href="#" onclick="detail.exeWorkflowCode(this,\''+id+'\')" style="display:none">test run</a>');
                    }
                    else if (fieldId === 'startCondition') {
                        html.push('<a href="#" onclick="detail.exeCondition(this,\''+id+'\')" style="display:none">test run</a>');
                    }
                }

                if (type === 'application' && fieldId === 'code') {
                    html.push('<a href="#" onclick="detail.manageModule(this)" style="display:none">manage module</a>');
                }
            }
            html.push('</div>');
            
            html.push('<div class="field-ops">');
            if (list[i].editable) {
                html.push('<div class="field-ops-btn" onclick="detail.startEdit(\''+fieldType+'\',\''+type+'\',this)">');
                html.push('<i class="fas fa-edit" title="Edit"></i></div>');
            }
            html.push('</div>');
        }

        html.push('<div class="field-btns">');
        if (type != "transaction") html.push('<a href="#" class="warning" onclick="panel.deleteRow(\''+type+'\',\''+id+'\',this)">delete</a>');
        html.push('<a href="#" onclick="detail.show(\''+type+'\',\''+id+'\',this,true)">hide</a>');
        html.push('</div>');

        el.innerHTML = html.join("");

        // Fill in data

        var elFieldValues = el.getElementsByClassName("field-value");
        var pFieldValue = 0;

        for (var i = 0; i < list.length; i++) {
            var fieldId = list[i].name;
            var fieldType = list[i].type;

            pFieldValue++; // Skip the title

            var elField;
            var v;
            if (fieldType !== "datalist") {
                v = data[fieldId];
                
                if (fieldId === "duration") {
                    v = Math.round(v)/1000.0
                }
                
                elField = elFieldValues[pFieldValue];
                pFieldValue++;
            }

            switch (fieldType) {
                case "status":
                    detail._renderDetailedStatus(elField, v);
                    break;
                case "boolean":
                    elField.innerText = v ? "Yes" : "No";
                    break;
                case "data":
                    elField.innerText = v ? JSON.stringify(v, null, 4) : "";
                    break;
                case "datalist":
                    var vs = data[fieldId];
                    if (vs && vs.length > 0) {
                        for (var j = 0; j < vs.length; j++) {
                            elField = elFieldValues[pFieldValue];
                            pFieldValue++;
                            v = vs[j];
                            elField.innerText = v ? JSON.stringify(v, null, 4) : "";
                        }
                    }
                    break;
                default:
                    elField.innerText = v ? v : "";
            }
        }
    },

    start: function(type, id, el) {
        detail._doOperation(type, id, el, "start");
    },

    stop: function(type, id, el) {
        detail._doOperation(type, id, el, "stop");
    },

    restart: function(type, id, el) {
        detail._doOperation(type, id, el, "restart");
    },

    _renderDetailedStatus: function(elField, objStatus) {
        var html = [];

        if (objStatus && objStatus.length>0) {
            for (var i = 0; i < objStatus.length; i++) {
                var engine = objStatus[i];

                html.push(ui.composeStatusBox(engine.status));
                html.push("<span class='status-detail-title'>Engine: ");
                html.push(engine.engineId);
                html.push("  [");
                html.push(engine.updateTime);
                html.push("]</span>");
                html.push("<br>");
            }
        }

        elField.innerHTML = html.join("");
    },

    _doOperation: function(type, id, el, operation) {
        if (! confirm("Are you sure to " + operation + " this " + type + "?")) return;

        var elRow = el ? detail._getRow(el) : detail._getRowById(type, id);
        if (! elRow) return;

        var elOps = el.parentElement;

        var elStatus = detail._getStatusInRow(elRow);
        if (elStatus) detail._setStatusInRow(elStatus, "operating");
        detail._refreshOperationsInRow(type, id, elOps); // Hide the buttons

        app.operateObject(type, id, operation, function(resultStatus) {
            detail._setStatusInRow(elStatus, resultStatus); // Refresh the status
            detail._refreshOperationsInRow(type, id, elOps, resultStatus); // Show the buttons
        });
    },

    _refreshOperationsInRow: function(type, id, el, resultStatus) {
        if (resultStatus)
            el.innerHTML = ui.composeOperations(type, {id:id, status:resultStatus});
        else
            el.innerHTML = "";
    },

    _getRow: function(el) {
        return el ? el.parentElement.parentElement : null;
    },

    _getRowById: function(type, id) {
        var elTRs = document.getElementById("panel-"+type+"s");
        if (!elTRs) return null;

        elTRs = elTRs.getElementsByTagName("tr");
        if (!elTRs || elTRs.length == 0) return null;

        for (var i = 0; i < elTRs.length; i++) {
            var elTR = elTRs[i];
            var elTD = elTR.getElementsByTagName("td");
            var rowId = elTD && elTD.length>0 ? elTD[0].innerText : null;
            if (rowId == id) return elTR;
        }

        return null;
    },

    _getStatusInRow: function(elRow) {
        var result = elRow ? elRow.getElementsByClassName("status-box") : null;
        if (result && result.length > 0) result = result[0];

        return result;
    },

    _setStatusInRow: function(elStatus, status) {
        var msg;
        
        if (! msg) {
            switch (status) {
                case "error":
                    msg = "Error";
                    break;
                case "running":
                    msg = "Running";
                    break;
                case "connected":
                    msg = "Connected";
                    status = "running";
                    break;
                case "stopped":
                    msg = "Stopped";
                    break;
                case "unconnected":
                    msg = "Unconnected";
                    status = "stopped";
                    break;
                case "unused":
                    msg = "Unused";
                    break;
                case "operating":
                    status = "unused";
                    msg = "Operating..."; // Operation is still in progress (You should open detailed page to check the real status)
                    break;
            }
        }

        elStatus.title = msg;
        elStatus.className = "status-box " + status;
    },

    getTransactions: function(type, id) {
        if (type === "integration") {
            app.query.transaction.integration = id;
            app.query.transaction.keyword = null;

            panel.reset("transactions");
            ui.selectTab("transactions");
        }
    },

    create: function(type) {
        var id = prompt('Input the ID of the new '+type+':');
        if (! id) return;

        if (app.checkExistence(type, id)) {
            alert('This '+type+' already exists!');
            return;
        }

        var data;

        if (type === "connection") {
            // Need more information
            data = {};
            
            data.applicationId = prompt('Input the application ID for this connection:');
            if (! data.applicationId) return;

            data.clientId = prompt('Input the client ID for this connection:');
            if (! data.clientId) return;
        }

        app.createObject(type, id, function(response) {
            panel.newObject(type, id, data);
        }, data);
    },

    _originalDataCache: {
        applicationEndPoints: {},
        protocolEndPoints: {},
        applicationTables: {},
        clientTables: {},
        integrationTables: {}
    },

    startEdit: function(fieldType, type, el) {
        // Change the field content to editable

        var elBtns = el.parentElement;
        var elContent = elBtns.previousElementSibling;
        var elField;

        switch (fieldType) {
            case "boolean":
                elField = elContent.children[0];
                var v = elField.innerText === 'Yes' ? ' checked' : '';
                elField.innerHTML = '<input type=checkbox'+v+'>'
                break;
            case "datalist":
                elFields = elContent.getElementsByClassName('field-value');

                if (elFields.length > 0) {
                    for (var i = 0; i < elFields.length; i++) {
                        elField = elFields[i];
                        elField.contentEditable = true;
                        elField.className = "field-value editable";
                    }
                    elFields[0].focus();
                }

                detail._displayLinksInContent(elContent, true);
                break;
            default:
                elField = elContent.children[0];
                elField.contentEditable = true;
                elField.className = "field-value editable";
                elField.focus();

                if (type === 'integration' || type === 'template' || type === 'application') {
                    detail._displayLinksInContent(elContent, true);
                }
        }

        // Change the buttons

        var html = [];
        html.push('<div class="field-ops-btn" onclick="detail.stopEdit(\''+fieldType+'\',\''+type+'\',this)">');
        html.push('<i class="fas fa-times" title="Stop editting"></i></div>');
        html.push('<div class="field-ops-btn" onclick="detail.saveEdit(\''+fieldType+'\',\''+type+'\',this)">');
        html.push('<i class="fas fa-check" title="Save"></i></div>');
        elBtns.innerHTML = html.join("");
    },

    stopEdit: function(fieldType, type, el) {
        // Change the field content to uneditable

        var elBtns = el.parentElement;
        var elContent = elBtns.previousElementSibling;
        var elField;

        switch (fieldType) {
            case "boolean":
                elField = elContent.children[0];
                elField.innerHTML = elField.children[0].checked ? 'Yes' : 'No';
                break;
            case "password":
                elField = elContent.children[0];
                elField.innerHTML = '';
                elField.contentEditable = false;
                elField.className = "field-value";
                break;
            case "datalist":
                elFields = elContent.getElementsByClassName('field-value');
                
                if (elFields.length > 0) {
                    for (var i = 0; i < elFields.length; i++) {
                        elField = elFields[i];

                        if (elField.getAttribute("isNew") === "true") {
                            // Remove the newly added, but empty field

                            if (elField.innerText.length == 0) {
                                if (elField.nextSibling.tagName === 'HR')
                                    elField.parentElement.removeChild(elField.nextSibling);
                                else if (elField.previousSibling && elField.previousSibling.tagName === 'HR')
                                    elField.parentElement.removeChild(elField.previousSibling);

                                elField.parentElement.removeChild(elField);
                                i--;
                            }
                            else {
                                elField.contentEditable = false;
                                elField.className = "field-value";
                            }
                        }
                        else {
                            elField.contentEditable = false;
                            elField.className = "field-value";
                        }
                    }
                }
                
                detail._displayLinksInContent(elContent, false);
                break;
            default:
                elField = elContent.children[0];
                elField.contentEditable = false;
                elField.className = "field-value";
                
                if (type === 'integration' || type === 'template' || type === 'application') {
                    detail._displayLinksInContent(elContent, false);
                }
        }

        // Change the buttons

        var html = [];
        html.push('<div class="field-ops-btn" onclick="detail.startEdit(\''+fieldType+'\',\''+type+'\',this)">');
        html.push('<i class="fas fa-edit" title="Edit"></i></div>');
        elBtns.innerHTML = html.join("");
    },

    saveEdit: function(fieldType, type, el) {
        var elBtns = el.parentElement;
        var elContent = elBtns.previousElementSibling;

        if (fieldType === "datalist") {
            var elFields = elContent.getElementsByClassName("field-value");
            var cache = detail._originalDataCache;

            // Get object ID and field ID from the last button
            var id = elContent.children[elContent.children.length-1].id;
            var fieldId = id.substring(id.indexOf("-")+1);
            id = id.substring(0, id.indexOf("-"));
            var subobjectType = fieldId==="endpoints" ? "endpoint" : "table";
            var subobjectIdField = fieldId==="endpoints" ? "id" : "name";

            var keepEditing = false;

            for (var i = 0; i < elFields.length; i++) {
                elField = elFields[i];

                if (elField.innerText.length == 0) {
                    if (elField.getAttribute("isNew") !== "true") {
                        // Remove the corresponding subobject

                        var subobject = detail._getSubObjectFromCache(type, id, fieldId, cache, i);
                        if (subobject) {
                            if (app.deleteSubobject(type, id, subobjectType, subobject[subobjectIdField]))
                                detail._removeSubObjectFromCache(type, id, fieldId, cache, i);
                            else
                                continue;
                        }
                    }

                    // Remove this empty field

                    if (elField.nextSibling.tagName === 'HR')
                        elField.parentElement.removeChild(elField.nextSibling);
                    else if (elField.previousSibling && elField.previousSibling.tagName === 'HR')
                        elField.parentElement.removeChild(elField.previousSibling);

                    elField.parentElement.removeChild(elField);
                    i--;
                }
                else {
                    var value = detail.parseJSONValue(elField);
                    if (value == null) {
                        keepEditing = true; // Wrong JSON format
                        continue;
                    }

                    if (elField.getAttribute("isNew") === "true") {
                        if (app.saveSubobject(type, id, subobjectType, value)) {
                            detail._updateSubObjectFromCache(type, id, fieldId, cache, i, value);
                            elField.removeAttribute('isNew');
                        }
                        else
                            keepEditing = true; // Failed to save
                    }
                    else {
                        if (detail._checkJSONValueChanged(value, detail._getSubObjectFromCache(type, id, fieldId, cache, i))) {
                            // Save the changed subobject

                            if (app.saveSubobject(type, id, subobjectType, value))
                                detail._updateSubObjectFromCache(type, id, fieldId, cache, i, value);
                            else
                                keepEditing = true; // Failed to save
                        }
                    }
                }
            }

            if (! keepEditing) detail.stopEdit(fieldType, type, el);
        }
        else {
            var elField = elContent.children[0];
            var value;

            // Retrieve value

            if (fieldType === "boolean")
                value = elField.children[0].checked;
            else
                value = elField.innerText;

            if (fieldType === "data") {
                value = detail.parseJSONValue(elField);
                if (value == null) return;
                else if (value.length == 0) value = null;
            }

            // Retrieve object ID and field ID

            var id = elField.id;
            var pos = id.indexOf("-");
            var fieldId = id.substring(pos+1);
            id = id.substring(0, pos);

            // Save the value

            var data = {
                id: id
            };
            data[fieldId] = value;

            app.saveObject(type, data, function(response) {
                var elRow = el.parentElement.parentElement.parentElement.previousElementSibling;
                detail._updateDataInRow(type, fieldId, value, elRow);

                detail.stopEdit(fieldType, type, el);
            });
        }
    },

    newDataItem: function(el) {
        var elContent = el.parentElement;
        var count = elContent.getElementsByClassName("field-value").length;

        if (count > 0) {
            var hr = document.createElement("hr");
            elContent.insertBefore(hr, el);
        }

        var div = document.createElement("div");
        div.className = "field-value editable";
        div.contentEditable = true;
        div.setAttribute("isNew", "true");

        // var id = el.id;
        // div.id = id + "-" + count;

        elContent.insertBefore(div, el);
    },

    exeWorkflowCode: function(el, id) {
        var code = el.previousElementSibling.innerText;

        if (code.indexOf("timer(") >= 0 || code.indexOf("in(") >= 0) {
            app.exeWorkflowCode(id, code, function(response){
                var result;
                try {
                    result = JSON.parse(response);
                    result = JSON.stringify(result, null, 4);
                } catch (e) {
                    result = response;
                }

                el.previousElementSibling.innerText += "\n\nResult: -----\n\n"+result;
            });
        }
        else {
            alert("Invalid iDSL code: not start with timer() or in()");
        }
    },

    exeCondition: function(el, id) {
        var code = el.previousElementSibling.innerText;
        code = detail.parseJSONValue(el.previousElementSibling);

        if (code == null) {}
        else if (code == '') {
            alert("Invalid cDSL code: empty condition");
        }
        else {
            if (code.hasOwnProperty("msg") || code.hasOwnProperty("config")) {
                app.exeCondition(id, code, function(response){
                    alert("Execution result:\n\n"+response);
                });
            }
            else {
                alert("Invalid cDSL testcase: no \"msg\", nor \"config\"");
            }
        }
    },

    manageModule: function(el) {
        // Change, Save, Remove module and jar files

        var module = detail.parseJSONValue(el.previousSibling);
        if (module == null) return;
        
        var moduleId;
        if (module && module.module) {
            moduleId = module.module; // The module ID
        }
        else {
            alert("No module specified");
            return;
        }

        app.getModule(moduleId, function(response) {
            var module = response ? response.result : null;
            var packages = module ? module.packages : null;
            var jars = module ? module.jars : null;

            detail._disableModuleControls(el, true);

            // Display the module management panel

            var div = document.createElement("div");
            var html = [];
            div.className = "panel-module";

            html.push('<div class="panel-module-title">Module</div>');
            html.push('<div class="panel-module-content">');
            html.push(moduleId);
            html.push('</div>');

            html.push('<div class="panel-module-title">Packages</div>');
            html.push('<div class="panel-module-content">');
            html.push('<div class="edit-box" contenteditable>');
            html.push(packages ? JSON.stringify(packages, null, 4) : "");
            html.push('</div>');
            html.push('<a href="#" onclick="detail.saveModule(this,\''+moduleId+'\')">save</a>');
            html.push('</div>');

            html.push('<div class="panel-module-title">Jar Files</div>');
            html.push('<div class="panel-module-content">');
            if (jars) {
                for (var i = 0; i < jars.length; i++) {
                    html.push('<div class="jar-file">');
                    html.push('<span>');
                    html.push(jars[i]);
                    html.push('</span>');
                    html.push('<a href="#" onclick="detail.deleteJarFile(this,\''+moduleId+'\')">delete</a>');
                    html.push('</div>');
                }
            }
            html.push('<div class="jar-file">');
            html.push('<form id="jar-form" enctype="multipart/form-data">');
            html.push('<input type="file" name="jar" onchange="detail.uploadJarFile(this,\''+moduleId+'\')">');
            html.push('</form>');
            html.push('</div>');
            html.push('</div>');

            html.push('<div class="panel-module-btns">');
            html.push('<a href="#" onclick="detail.deleteModule(this,\''+moduleId+'\')" class="warning">delete</a>');
            html.push('<a href="#" onclick="detail.closeModulePanel(this)">close</a>');
            html.push('</div>');

            div.innerHTML = html.join("");
            el.parentElement.appendChild(div);
        });
    },

    saveModule: function(el, id) {
        var elField = el.previousElementSibling;
        var value = detail.parseJSONValue(elField);
        if (value == null) return;

        var obj = {module:id, packages:value};

        app.saveModule(obj, function(response) {
            alert("Packages saved");
        });
    },

    closeModulePanel: function(el) {
        var elPanel = el.parentElement.parentElement;
        var el = elPanel.previousElementSibling;

        elPanel.parentElement.removeChild(elPanel);

        detail._disableModuleControls(el, false);
    },

    deleteModule: function(el, id) {
        if (! confirm("Are you sure to delete module "+id+"?")) return;

        app.deleteModule(id, function(response) {
            detail.closeModulePanel(el);
        });
    },

    uploadJarFile: function(el, id) {
        var filename = detail._getFilenameFromInput(el);
        var form = el.parentElement;

        if (! filename) return;

        app.uploadJarFile(id, new FormData(form), function(response) {
            alert("Jar file uploaded");
            detail._updateJarFileList(el.parentElement.parentElement.parentElement, filename, id);
        });
    },

    _updateJarFileList: function(elList, filename, moduleId) {
        var els = elList.children;

        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            var elSpan = el.getElementsByTagName('SPAN');
            if (elSpan.length == 0) continue;
            else elSpan = elSpan[0];

            if (elSpan.innerText === filename) return; // Already exists
        }

        // Add a new file

        var div = document.createElement("div");
        div.className = "jar-file";
        var html = [];

        html.push('<span>');
        html.push(filename);
        html.push('</span>');
        html.push('<a href="#" onclick="detail.deleteJarFile(this,\''+moduleId+'\')">delete</a>');

        div.innerHTML = html.join("");
        elList.insertBefore(div, elList.lastElementChild);
    },

    deleteJarFile: function(el, moduleId) {
        var filename = el.previousElementSibling.innerText;

        app.deleteJarFile(moduleId, filename, function(response) {
            var list = el.parentElement.parentElement;
            list.removeChild(el.parentElement);
        });
    },

    _getFilenameFromInput: function(el) {
        var filename = el.value;
        if (filename.length == 0) return null;

        var pos = filename.lastIndexOf("\\");
        if (pos >= 0) filename = filename.substring(pos+1);
        else {
            pos = filename.lastIndexOf("/");
            if (pos >= 0) filename = filename.substring(pos+1);
        }

        if (filename.length == 0) return null;
        else return filename;
    },

    _disableModuleControls: function(el, disabled) {
        el.style.display = disabled ? "none" : "";
        el.previousElementSibling.style.display = disabled ? "none" : "";
        el.parentElement.nextSibling.style.display = disabled ? "none" : "";
    },

    // Return the parsed JSON object, or null if the JSON format is invalid, or "" is the value is empty
    parseJSONValue: function(el) {
        var value = el.innerText;

        if (value.length == 0)
            return value;
        else {
            try {
                value = JSON.parse(value);
                return value;
            }
            catch (e) {
                alert("Invalid JSON format: " + e.message);
                el.focus();
                return null;
            }
        }
    },

    _displayLinksInContent: function(elContent, show) {
        var els = elContent.getElementsByTagName("A");
        if (els.length == 0) return;

        for (var i = 0; i < els.length; i++) {
            els[i].style.display = show ? "" : "none";
        }
    },

    _fieldPositionInRow: {
        application: {title: 1, desc: 2, autoStart: 3, updateTime: 5},
        client: {title: 1, desc: 2, updateTime: 4},
        connection: {updateTime: 4},
        integration: {title: 1, autoStart: 2, updateTime: 4},
        protocol: {title: 1, desc: 2, updateTime: 4},
        template: {title: 1, desc: 2, updateTime: 4},
        user: {name: 1, admin: 2, updateTime: 4}
    },

    _updateDataInRow: function(type, fieldId, value, elRow) {
        var positions = detail._fieldPositionInRow[type];
        var elFields = elRow.children;
        
        if (positions[fieldId]) {
            var el = elFields[positions[fieldId]];

            switch (fieldId) {
                case 'autoStart':
                case 'admin':
                    el.innerHTML = ui.composeYesBox(value);
                    break;
                default:
                    el.innerText = value;
            }
        }

        if (positions["updateTime"]) {
            var el = elFields[positions["updateTime"]];
            el.innerText = app.getCurrentTimeStr();
        }
    },

    _checkJSONValueChanged: function(value, cacheValue) {
        if (value===null && cacheValue!==null || value!==null && cacheValue===null)
            return true;
        else if (value===null && cacheValue===null)
            return false;
        else if (JSON.stringify(value) != JSON.stringify(cacheValue))
            return true;
        else
            return false;
    },

    _getSubObjectFromCache: function(type, id, fieldId, cache, position) {
        var attr = type + (fieldId === "endpoints" ? "EndPoints" : "Tables");
        var objs = cache[attr][id];
        return objs && position<objs.length ? objs[position] : null;
    },

    _removeSubObjectFromCache: function(type, id, fieldId, cache, position) {
        var attr = type + (fieldId === "endpoints" ? "EndPoints" : "Tables");
        var objs = cache[attr][id];
        
        if (objs && position<objs.length) {
            objs.splice(position, 1);
        }
    },

    _updateSubObjectFromCache: function(type, id, fieldId, cache, position, value) {
        var attr = type + (fieldId === "endpoints" ? "EndPoints" : "Tables");
        var objs = cache[attr][id];
        if (! objs) return;

        if (position < objs.length) {
            objs[position] = value;
        }
        else if (position == objs.length) {
            objs.push(value);
        }
    }
};

var app = {
    query: {
        transaction: {
            integration: null,
            keyword: null
        }
    },

    getCurrentTimeStr: function() {
        var d = new Date();
        var y = d.getFullYear();
        var m = d.getMonth()+1;
        var day = d.getDate();
        var h = d.getHours();
        var min = d.getMinutes();
        var s = d.getSeconds();

        return y+"-"+(m>9?"":"0")+m+"-"+(day>9?"":"0")+day+" "+(h>9?"":"0")+h+":"+(min>9?"":"0")+min+":"+(s>9?"":"0")+s;
    },

    login: function(event) {
        var el = document.getElementById("loginForm");
        var object = {
            user: el.querySelector("input[name=user]").value,
            password: el.querySelector("input[name=password]").value
        };

        svc.post("/user/login", object, function(response) {
            svc.setToken(response.result);
            app.myselfUserId = app.getMyself();
            app.startRefreshingToken();
            ui.showConsole();
        });
    },

    listEngines: function(callback) {
        svc.get("/cluster/engine", callback);
    },

    listApplications: function(abstract, callback) {
        svc.get("/application?abstract="+abstract+"&from=0&length=1000", callback);
    },

    isEngineAlive: function(heartbeatTime, expireInterval) {
        var heartbeat = new Date(heartbeatTime);
        var now = new Date();
        var diff = now.getTime() - heartbeat.getTime();

        return (diff / 1000) < expireInterval;
    },

    listClients: function(callback) {
        svc.get("/client?from=0&length=1000", callback);
    },

    listUsers: function(callback) {
        svc.get("/user?from=0&length=1000", callback);
    },

    listConnections: function(callback) {
        svc.get("/connection?from=0&length=1000", callback);
    },

    listIntegrations: function(abstract, callback) {
        svc.get("/integration?abstract="+abstract+"&fields=id,title,desc,status,autoStart,createTime,updateTime&from=0&length=1000", callback);
    },

    listTransactions: function(integration, keyword, callback) {
        if (! integration) integration = "";
        if (! keyword) keyword = "";

        var d = new Date();
        d.setHours(d.getHours() - 48);
        var d_month = d.getMonth()+1;
        var d_day = d.getDate();
        var startTime = d.getFullYear()+"-"+(d_month>9?"":"0")+d_month+"-"+(d_day>9?"":"0")+d_day;
        
        svc.get("/transaction?integrationId="+integration+"&search="+keyword+"&startTime="+startTime+" 00:00:00&from=0&length=100", callback);
    },

    getObject: function(type, id, callback) {
        var needStatus = type==='application' || type==='connection' || type==='integration';
        var needCode = type==='integration' || type==='template';

        if (type === "protocol") type = "application";
        else if (type === "template") type = "integration";

        if (needStatus) {
            svc.get("/"+type+"/"+id, function(responseObj) {
                if (responseObj && responseObj.result) {
                    // Retrieve cluster status further
                    svc.get("/cluster/"+type+"?id="+id, function(responseStatus) {
                        responseObj.result.status = responseStatus.result;

                        if (needCode) {
                            svc.get("/module/code?owner=integration&filename="+id+".node.js", function(responseCode) {
                                responseObj.result.code = responseCode;
                                callback(responseObj);
                            });
                        }
                        else
                            callback(responseObj);
                    });
                }
            });
        }
        else if (needCode) {
            svc.get("/"+type+"/"+id, function(responseObj) {
                if (responseObj && responseObj.result) {
                    svc.get("/module/code?owner=integration&filename="+id+".node.js", function(responseCode) {
                        responseObj.result.code = responseCode;
                        callback(responseObj);
                    });
                }
            });
        }
        else
            svc.get("/"+type+"/"+id, callback);
    },

    operateObject: function(type, id, operation, callback) {
        // Perform the operation

        var op = type==="connection" ? (operation==="start" ? "connect" : "disconnect") : operation;

        var data = {"action": op};
        data[type+"Id"] = id;

        svc.post("/"+type+"/operation", data, function(response) {
            // Check operation result
    
            setTimeout(function() {
                svc.get("/cluster/"+type+"?id="+id, function(response) {
                    callback(app._mergeClusterStatus(response.result));
                });
            }, 3000); // Wait a while for the operation to complete    
        });
    },

    createObject: function(type, id, callback, data) {
        var obj = {id:id};

        if (type === "protocol") {
            obj.abstract = true;
            type = "application";
        }

        if (type === "template") {
            obj.abstract = true;
            type = "integration";
        }

        if (type === "connection") {
            obj.applicationId = data.applicationId;
            obj.clientId = data.clientId;
        }

        svc.put("/"+type, obj, callback);
    },

    _mergeClusterStatus: function(result) {
        if (! result || result.length == 0) return "operating";

        // If the engine's updateTime is much earlier than current time, or,
        //      if the status of any engine is different from the others,
        //      then the merged status is "operating"

        var status = result[0].status;

        for (var i = 0; i < result.length; i++) {
            var engine = result[i];
            var updateTime = new Date(engine.updateTime);
            var now = new Date();

            if (now.getTime() - updateTime.getTime() > 30000) return "operating";
            if (engine.status != status) return "operating";

            status = engine.status;
        }

        return status;
    },

    startRefreshingToken: function() {
        window.setInterval(function() {
            svc.get("/user/myself");
        }, 1000 * 60 * 10); // Every 10 minutes
    },

    checkExistence: function(type, id) {
        if (type === "protocol") type = "application";
        else if (type === "template") type = "integration";

        var response = svc.get("/"+type+"?fields=id&ids="+id);
        if (! response) return true; // There's error, so we assume it exists
        else return response.result.length > 0;
    },

    saveObject: function(type, data, callback) {
        if (type === "protocol") type = "application";
        else if (type === "template") type = "integration";

        if (type === "user") {
            if (data.hasOwnProperty('admin')) {
                data.permissions = [{
                    role: data.admin ? "admin" : "visitor"
                }];
                delete data.admin;
            }
        }

        if (type === "integration" && data.hasOwnProperty('code')) {
            svc.post("/module/code?saveOnly=true&owner=integration&filename="+data.id+".node.js", data.code, callback);
        }
        else {
            svc.put("/"+type, data, callback);
        }
    },

    deleteObject: function(type, id, callback) {
        if (type === "protocol") type = "application";
        else if (type === "template") type = "integration";

        svc.delete("/"+type+"/"+id, callback);
    },

    saveSubobject: function(type, id, subobjectType, data) {
        if (type === "protocol") type = "application";
        else if (type === "template") type = "integration";

        var url = "/"+type+"/"+subobjectType;
        data[type+"Id"] = id; // Server side nneds this ID

        var result = svc.put(url, data);

        delete data[type+"Id"];

        return result !== null;
    },

    deleteSubobject: function(type, id, subobjectType, subobjectId) {
        if (type === "protocol") type = "application";
        else if (type === "template") type = "integration";

        var subobjectIdField = subobjectType==="endpoint" ? "id" : "name";
        var url = "/"+type+"/"+subobjectType+"?"+type+"Id="+id+"&"+subobjectIdField+"="+subobjectId;

        if (subobjectType === "table") url += "&removePhysically=false";

        return svc.delete(url) !== null;
    },
    
    isAdmin: function(user) {
        if (user && user.permissions && user.permissions.length > 0) {
            return user.permissions[0].role === "admin";
        }
        else
            return false;
    },

    getMyself: function() {
        var result = svc.get("/user/myself");
        if (result && result.result) return result.result.id;
        else return null;
    },

    myselfUserId: null,

    exeWorkflowCode: function(id, code, callback) {
        svc.post("/module/code?filename="+id+".i.dsl.js", code, callback);
    },

    exeCondition: function(id, code, callback) {
        svc.post("/module/code?type=c.dsl.json&returnTimespan=true", code, callback);
    },

    getModule: function(id, callback) {
        svc.get("/module/java?module="+id, callback, true);
    },

    saveModule: function(data, callback) {
        svc.put("/module/java", data, callback);
    },

    deleteModule: function(id, callback) {
        svc.delete("/module/java?module="+id, callback);
    },

    uploadJarFile: function(id, data, callback) {
        svc.postFile("/module/java?module=" + id, data, callback);
    },

    deleteJarFile: function(id, jar, callback) {
        svc.delete("/module/java?module=" + id +"&jar=" + jar, callback);
    }
}

ui.init();

(function(){
    var search = window.location.hash.substring(1);
    if (!search) search = window.location.search;
    else search = search.substring(search.indexOf('?'));

    var urlParams = new URLSearchParams(search);
    var token = urlParams.get('token');
    
    if (token && token.length > 0) {
        svc.setToken(token);
        app.myselfUserId = app.getMyself();
        app.startRefreshingToken();
        ui.showConsole();
    }
})();
