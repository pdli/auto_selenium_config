/**
 * Created by pengl on 2/23/2017.
 * Description: This script is used to generate JSON file for Propel URL generation
 * Parameters : primary data from storage
 * Return     : propelUploadJSON_, eSSToolComJSON_
 */
const PropelFileManagementAPI = require('./api/PropelFileManagement');
const io = require('selenium-webdriver/io');
const path = require('path');

//customer info variable
var log;
var jsonFile;
var g_jBillingID = "123456";
var cusInfoObj;
var propelUploadedJSON = [];
var eSSToolCompartmentsJSON;

/*********************************************************
 * Main Process
 * 1) Import data from primary data storage
 * 2) Generate propelUploadJSON_ for Propel URL generation
 * 3) Generate eSSToolComJSON_ for Propel Catalogs config
 ********************************************************/

function run( options ) {

    return new Promise(function(resovle, reject){

        //set trace level: info by default
        setUp( options );

        g_jBillingID = options.billingID;

        if( options.jsonFile !== undefined && options.jsonFile.length >0) {

            jsonFile = options.jsonFile
        } else {

            jsonFile = PropelFileManagementAPI.getPathOfPrimaryDataJsonFile( options.tenantID );
        }

        io.read( jsonFile )
                .then(function (x) {

                    readFile(x);
                })
                .then(function () {

                    resovle();
                })
                .catch( function( err ) {

                    reject( err );
                });
    });
}

function setUp( options ) {

    //set trace level: info by default.
    const log4js = require('log4js');
    log4js.configure("./config/log4js.json");
    log = log4js.getLogger( options.debug);

}

function readFile( buffer ) {

    cusInfoObj = JSON.parse( buffer );
    log.debug(" Raw information from QRS includes:");
    log.debug( cusInfoObj );

    fillPropelUploadedJSON();
    fillESSToolCompJSON();
    //exportFile();
}

function exportFile() {

    var propelFIle = path.resolve(__dirname, '../file/propelUploadJSON_.json');
    var esstFile = path.resolve(__dirname, '../file/eSSToolComJSON_.json');
    io.write(propelFIle, JSON.stringify( propelUploadedJSON ));
    io.write(esstFile, JSON.stringify( eSSToolCompartmentsJSON ));
}

function fillESSToolCompJSON() {

    eSSToolCompartmentsJSON = {"compartments": {}};
    var compartmentJson = {"compartments": []};

    for (var k = 0; k< cusInfoObj.dataCenter.length; k++) {

        var dc = cusInfoObj.dataCenter[k];
        var compartments = cusInfoObj.customerDCLocations[dc];

        //fill comparments
        for (var i=0; i< compartments.length; i++) {
            var json = {
                "name": compartments[i],
                "tenantId": cusInfoObj.tenantID,
                "username": cusInfoObj.serviceAccount,
                "password": cusInfoObj.servicePwd,
                "datacenter": cusInfoObj.dataCenter[k],
                "vlans": ""
            }
            compartmentJson.compartments.push(json);
        }
    }

    eSSToolCompartmentsJSON.compartments = compartmentJson;

    //add urlname
    eSSToolCompartmentsJSON['urlName'] = cusInfoObj.urlName;

    //add Propel admin accoun & password
    eSSToolCompartmentsJSON['propelAccount'] = cusInfoObj.propelAccount;
    eSSToolCompartmentsJSON['propelPwd'] = cusInfoObj.propelPwd;

    //add tenantID
    eSSToolCompartmentsJSON['tenantID'] = cusInfoObj.tenantID;

    //add data_center
    eSSToolCompartmentsJSON['prime_data_center'] = cusInfoObj.dataCenter[0];

    //add data_center Location
    var dataCenter = cusInfoObj.dataCenter[0];
    eSSToolCompartmentsJSON['prime_DC_location'] = cusInfoObj.customerDCLocations[ dataCenter ][0];

    //add service account & pwd
    eSSToolCompartmentsJSON['serviceAccount'] = cusInfoObj.serviceAccount;
    eSSToolCompartmentsJSON['servicePwd'] = cusInfoObj.servicePwd;

    //add jBilling currency
    eSSToolCompartmentsJSON['homeCurrency'] = cusInfoObj.homeCurrency;

    //add company code
    eSSToolCompartmentsJSON['companyCode'] = cusInfoObj.companyCode;

    //add customer location
    eSSToolCompartmentsJSON['customer_loc'] = cusInfoObj.locationName;

    //add management region
    eSSToolCompartmentsJSON['management_reg'] = cusInfoObj.managementRegion;

    //add required ticket email
    eSSToolCompartmentsJSON['ticket_email'] = cusInfoObj.contactEmail;

    log.trace(' The propel org JSON is ==>');
    log.trace(eSSToolCompartmentsJSON);
}


function fillPropelUploadedJSON() {
    var strName = cusInfoObj.customerName;
    strName = strName.toLowerCase();
    strName = strName.replace(/ |_/g, '-');

    propelUploadedJSON[0] = {
        "name": strName,
        "urlName": cusInfoObj.urlName,
        "displayName": cusInfoObj.customerName,//.replace(/_/g, ' '),
        "description":"",
        "iconUrl":"",
        "adminUsers":[
            {
                "username": cusInfoObj.propelAccount, //migration
                "password": cusInfoObj.propelPwd,
                "editable": true,
                "disable": false
            }
        ],
        "groupUserMap": {
            "ORG_ADMIN": [
                cusInfoObj.propelAccount, //migration
            ],
            "IDM_ADMIN": [],
            "SAP_ADMIN": [],
            "VPC_PORTAL_USER": [],
            "VPC_NETWORK_ADMINISTRATOR": [],
            "VPC_PORTAL_READONLY": [],
            "VPC_NETWORK_READONLY": [],
            "VPC_SUBSCRIPTION_ADMIN": [],
            "ACCOUNT_MONITOR": []
        },
        "compartments":[],
        "cRoles":[
            {
                "name":"VPC_PORTAL_USER",
                "description":""
            },
            {
                "name":"VPC_NETWORK_ADMINISTRATOR",
                "description":""
            },
            {
                "name": "VPC_PORTAL_READONLY",
                "description": ""

            },
            {
                "name": "VPC_NETWORK_READONLY",
                "description": ""
            },
            {
                "name": "VPC_SUBSCRIPTION_ADMIN",
                "description": ""
            }
        ],
        "role-comps":[],
        "jbilling":{
            "customerId":g_jBillingID,
            "loginName":"admin",
            "password":"******",
            "currencyCode": cusInfoObj.homeCurrency
        },
        "irim":{
            "customerId": g_jBillingID,
            "loginName":"admin",
            "password":"******"
        }
    };
    calculateRoleComps();
    calculateComps();
}

function calculateRoleComps() {
    for (var k = 0; k < cusInfoObj.dataCenter.length; k++) {
        var dc = cusInfoObj.dataCenter[k];
        var compartments = cusInfoObj.customerDCLocations[dc];
        for (var i = 0; i < compartments.length; i++) {
            var json = {
                "roleName": "VPC_PORTAL_USER",
                "compName": compartments[i]
            };
            propelUploadedJSON[0]["role-comps"].push(json);
        }
    }
}

function calculateComps() {
    for (var k = 0; k < cusInfoObj.dataCenter.length; k++) {
        var dc = cusInfoObj.dataCenter[k];
        var compartments = cusInfoObj.customerDCLocations[dc];
        for (var i = 0; i < compartments.length; i++) {
            var isDefault = false; //Default conf in Propel UI
            var isSecondary = false; //secondary data locations for Dual data center
            if (k == 0 && i == 0) isDefault = true;
            if (i == 1) isSecondary = true;

            var json = {
                "serviceAccount": {
                    "name": cusInfoObj.serviceAccount,
                    "password": cusInfoObj.servicePwd
                },
                "name": compartments[i],
                "description": "",
                "tenantId": cusInfoObj.tenantID,
                "dataCenter":
                        {
                            "id": "***FAKEDATA***",
                            "dcCode": cusInfoObj.dataCenter[k] //"EBM01",
                        },
                "isDefault": isDefault,
                "isSecondary": isSecondary
            }
            propelUploadedJSON[0].compartments.push(json);
        }

    }
}

function getData() {
    return cusInfoObj;
}

function  getPropelUploadJson() {

    return propelUploadedJSON[0];
}

function getOrgCfgJson() {

    return eSSToolCompartmentsJSON;
}

module.exports = {
    run : run,
    data: getData,
    propelUploadJson: getPropelUploadJson,
    getPropelOrgCfgJson: getOrgCfgJson
}
