/**
 * Created by pengl on 5/11/2017.
 *
 * Function: Config catalog/categories/catalog Items for one org.
 * * * * * * The continue run is supported by current scripts.
 *
 */
const promise = require('selenium-webdriver').promise;
const mvpcRun = require('./task/task_1_config_MVPC_catalog_In_Propel');
const suppliersRun = require('./task/task_2_config_Suppliers_In_Propel');
const categoriesRun = require('./task/task_3_config_categories_In_Propel');
const catalogItemRun = require('./task/task_4_config_catalog_items_In_Propel');
const PropelFileManagementAPI = require('./api/PropelFileManagement');
const PropelCommand = require('../util/src/PropelCommands');
const path = require('path');
const io = require('selenium-webdriver/io');
const g_file = path.resolve(__dirname, '../file/resumeRun.json');

const taskList = [mvpcRun, suppliersRun, categoriesRun, catalogItemRun];

var log;
var customerJson = {};

console.time("configCatalog");
/***********************************************************
 * Main Process
 * 0) Check if continue run is required
 * 1) Login Propel with Admin Account
 * 2) Read external file for further configuration
 * 3) Run selenium process:
 * ****** Add Suppliers: MPC, SMC
 * ****** Aggregate Suppliers
 * ****** Add 10 Categories
 * ****** Apply Categories to 12 Catalog Items
 ***********************************************************/

function run( options ) {

    return new Promise(function(resolve, reject){

        setUp( options );

        log.info("****** Step - 7: Configure Customer Org in ProPel ******");

        //main process
        promise
            .fulfilled()
            .then( function () {

                return calcBeginningIndexOfTaskList( options);
            })
           .then( function( index ) {

                var x = recurseToZero( index, options);
                return x;
           })
           .then( function () {

                log.info( "Org - " + options.customerJson.urlName +" is finished to configure catalog." );
                log.info("Bravo~~~ ");
                console.timeEnd("configCatalog");
                resolve();
           })
           .catch( function(err){ //check result

                log.error(err);
                console.timeEnd("configCatalog");
                reject();
           });
    });
}

function calcBeginningIndexOfTaskList( options ) {

    return PropelFileManagementAPI
        .getParamFromResumeRun( options.customerJson.tenantID, "resumeStep")
        .then( function ( json ) {

            //rerun request from command line
            if( options.reRun !== undefined){
                return 0;
            }
            //continue run from resumeRun.json
            if( json !== undefined &&
                json.resumeStep !== undefined &&
                Number.isInteger( json.resumeStep)) {

                return json.resumeStep;
            } else {

                return 0;
            }
        });
}

function recurseToZero( index, options ){

    if( index >= taskList.length ) {

        console.log("Index > length");
        return index;
    }

    return taskList[index].run( options )
        .then( function () {

            PropelFileManagementAPI.updateResumeRunByTenantId( options.customerJson.tenantID, index + 1);
            return( recurseToZero( index + 1, options ) ); // RECURSE!
        })
        .catch( function ( err ) {

            throw err;
        });
}


function setUp( options ) {

    //setUp log level
    const log4js = require('log4js');
    log4js.configure("./config/log4js.json");
    log = log4js.getLogger( options.debug);
}

module.exports = {
    run : run
}
