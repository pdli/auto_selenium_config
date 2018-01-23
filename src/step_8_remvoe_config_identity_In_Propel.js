/**
 * Created by pengl on 5/11/2017.
 *
 * Function: Config catalog/categories/catalog Items for one org.
 *
 */

const WebDriverFactory = require('../util/src/WebdriverFactory');
const WebDriverCommands = require('../util/src/WebdriverCommands');
const PropelCommands = require('../util/src/PropelCommands');
const config = require('../config/config.json');
const By = require('selenium-webdriver').By;
const until = require('selenium-webdriver').until;
const io = require('selenium-webdriver/io');
const path = require('path');

const PROPEL_SERVER = config.propelServer;
const TIMEOUT = config.propelElementTimeout;
const TIMEOUT_ORGCHECK = config.propelValidLoadingTime;

var log;
var driver;
var customerJson = {};
var webPromise;

console.time("Remove Identity Config");
/***********************************************************
 * Main Process
 * 1) Login Propel with Admin Account
 * 2) Run selenium process:
 * ****** Remove all compartments
 * ******
 * ******
 ***********************************************************/

function run( options ) {

    return new Promise(function(resovle, reject){

        setUp( options );

        log.info( "****** Step - 8: Remove Identity Config :9200 for ProPel Org: " + customerJson.urlName + " ******");

        startSelenium(resovle, reject);
    });
}


function startSelenium( resovle, reject ) {

    driver = new WebDriverFactory( config.browser ).driver;

    webPromise = PropelCommands.logInPropel( driver, PROPEL_SERVER, "Provider", "admin", "admin" );

    webPromise
            .then( removeUsers )
            .then( removeRoles )
            .then( removeGroups )
            .then( removeCompartments )
            .then( tearDown )
            .then( function() {

                resovle();
                log.info("===> Remove Identity Configuration on :9200 completed <===");
                console.timeEnd("Remove Identity Config");
            })
            .catch( function(err){ //check result

                PropelCommands.takeScreenShot(driver, "removeIdentityConfig_snapshot_" + customerJson.urlName);
                log.error( err);
                tearDown();
                console.timeEnd("Remove Identity Config");
                reject( err );
            });
}


function setUp(options ){

    //set up log level
    const log4js = require('log4js');
    log4js.configure("./config/log4js.json");
    log = log4js.getLogger( options.debug);

    //init variables
    customerJson = options.customerJson;
}

function removeUsers() {

    var userURL = PROPEL_SERVER + ':9200/organization/' + customerJson.urlName + '/internalUsers';
    PropelCommands.getPropelUrl( driver, userURL, TIMEOUT);

    PropelCommands.waitPageLoading( driver, TIMEOUT );

    var trashLocator = By.className('lifecycle-icon-Trash');
    driver.findElements( trashLocator ).then( function ( elements ) {

        log.debug('==> Begin to remove ALL users: ' + elements.length );
        for( var i=0; i<elements.length; i++){

            ( function ( i ) {

                var index = 1;
                PropelCommands.waitPageLoading( driver, TIMEOUT);

                var lastTrashLocator = By.xpath('//i[@class="lifecycle-icon-Trash"]['+ index +']');
                WebDriverCommands.clickButton( driver, lastTrashLocator, TIMEOUT);

                var lastUserNameLocator = By.xpath('//i[@class="lifecycle-icon-Trash"]['+ index +']' +
                    '//ancestor::div[@class="row list-item ng-scope"]/div[@class="small-6 medium-6 column ph0"]//small');
                driver.findElement( lastUserNameLocator).getText().then( function (str) {
                    log.debug('  --> Remove user: ' + str);
                });

                var removeBtnLocator = By.xpath('//div[@class = "modal-footer"]/button[text() = "Remove"]');
                WebDriverCommands.clickButton( driver, removeBtnLocator, TIMEOUT);

                PropelCommands.waitPageLoading( driver, TIMEOUT);

                var userURL = PROPEL_SERVER + ':9200/organization/' + customerJson.urlName + '/internalUsers';
                PropelCommands.getPropelUrl( driver, userURL, TIMEOUT);

                PropelCommands.waitPageLoading( driver, TIMEOUT );
            })( i );
        }
    });
}

function removeGroups() {

    var groupURL = PROPEL_SERVER + ':9200/organization/' + customerJson.urlName + '/group';
    PropelCommands.getPropelUrl( driver, groupURL, TIMEOUT);

    PropelCommands.waitPageLoading( driver, TIMEOUT );

    var trashLocator = By.className('lifecycle-icon-Trash');
    driver.findElements( trashLocator ).then( function ( elements ) {

        log.debug('==> Begin to remove ALL groups: ' + elements.length );

        for( var i= elements.length; i>0; i--){

            ( function ( index ) {

                var lastTrashLocator = By.xpath('(//i[@class="lifecycle-icon-Trash"])['+ index +']');
                WebDriverCommands.clickButton( driver, lastTrashLocator, TIMEOUT);

                var lastGroupNameLocator = By.xpath('(//i[@class="lifecycle-icon-Trash"])['+ index +']' +
                    '//ancestor::div[@class="row list-item ng-scope"]/div[@class="small-6 medium-7 column ph0"]//small');
                driver.findElement( lastGroupNameLocator)
                    .getText()
                    .then( function (str) {

                        //Display logs
                        log.debug('  --> Remove group: ' + str);

                        //Pass parameter to promise chain
                        return str;
                    })
                    .then( function ( groupName ) {

                        //If it is "Propel Users", skip this remove operation
                        if ( groupName === "Propel Users") {

                            var groupURL = PROPEL_SERVER + ':9200/organization/' + customerJson.urlName + '/group';
                            PropelCommands.getPropelUrl( driver, groupURL, TIMEOUT);

                            PropelCommands.waitPageLoading( driver, TIMEOUT );
                        } else {

                            var shadowPanelLocator = By.className('reveal-modal-bg fade in');
                            WebDriverCommands.removeShadowPanel( driver, shadowPanelLocator, TIMEOUT);

                            var removeBtnLocator = By.xpath('//div[@class="modal-footer"]/button[text() = "Remove"]');
                            WebDriverCommands.clickButton( driver, removeBtnLocator, TIMEOUT);

                            PropelCommands.waitPageLoading( driver, TIMEOUT);

                            var groupURL = PROPEL_SERVER + ':9200/organization/' + customerJson.urlName + '/group';
                            PropelCommands.getPropelUrl( driver, groupURL, TIMEOUT);

                            PropelCommands.waitPageLoading( driver, TIMEOUT );
                        }
                });
            })(i);
        }
    });
}

function removeRoles() {

    var roleURL = PROPEL_SERVER + ':9200/organization/'+ customerJson.urlName +'/role';
    PropelCommands.getPropelUrl( driver, roleURL, TIMEOUT);

    PropelCommands.waitPageLoading( driver, TIMEOUT);

    var trashLocator = By.className('lifecycle-icon-Trash');
    driver.findElements( trashLocator ).then( function (elements) {

        log.debug('==> Begin to remove ALL roles: ' + elements.length );
        for(var i=0; i<elements.length; i++) {

            ( function ( index ) {

                var lastTrashLocator = By.xpath('//i[@class="lifecycle-icon-Trash"][last()]');
                WebDriverCommands.clickButton( driver, lastTrashLocator, TIMEOUT);

                var lastRoleNameLocator = By.xpath('//i[@class="lifecycle-icon-Trash"][last()]' +
                    '//ancestor::div[@class="row list-item ng-scope"]/div[@class="small-4 medium-4 column ph0"]//small');
                driver.findElement( lastRoleNameLocator ).getText().then( function (str) {
                    log.debug('  --> Remove role: ' + str);
                });

                var shadowPanelLocator = By.className('reveal-modal-bg fade in');
                WebDriverCommands.removeShadowPanel(driver, shadowPanelLocator, TIMEOUT);

                var removeBtnLocator = By.xpath('//div[@class="modal-footer"]/button[text() = "Remove"]');
                WebDriverCommands.clickButton( driver, removeBtnLocator, TIMEOUT);

                PropelCommands.waitPageLoading( driver, TIMEOUT);

                var roleURL = PROPEL_SERVER + ':9200/organization/'+ customerJson.urlName +'/role';
                PropelCommands.getPropelUrl( driver, roleURL, TIMEOUT);

                PropelCommands.waitPageLoading( driver, TIMEOUT);

            })(i);
        }
    });


}

function removeCompartments() {

    var compartmentURL = PROPEL_SERVER + ':9200/organization/' + customerJson.urlName + '/compartment/';
    PropelCommands.getPropelUrl( driver, compartmentURL, TIMEOUT);

    //wait for full page loading
    var compartmentsLocator = By.xpath('//h3[text() = "Compartments"]');
    WebDriverCommands.waitElementAvailable( driver, compartmentsLocator, TIMEOUT);

    //remove compartment locator
    var trashLocator = By.className('lifecycle-icon-Trash');
    driver.findElements( trashLocator ).then( function ( elements ) {

        log.debug('==> Begin to remove FIRST ' + elements.length +' compartments.');
        log.debug('==> **NOTIFY: if there are >5 compartments, you need to re-run this command. **');
        for(var i=0; i<elements.length; i++){

            removeOneCompartment();
        }
    });
}

function removeOneCompartment() {

    //There are some tricks here, be careful
    // - remove compartment, but needs to wait for staleness
    // - Display logs, but wait for btn available
    var trashLocator = By.xpath('//i[@class = "lifecycle-icon-Trash"][last()]');
    WebDriverCommands.clickButton( driver, trashLocator, TIMEOUT);

    var compDisplayNameLocator = By.xpath('//i[@class = "lifecycle-icon-Trash"][last()]' +
        '//ancestor::div[@class="row list-item ng-scope"]/div/a/h5/small');
    driver.findElement( compDisplayNameLocator ).getText().then( function ( str ) {

        log.debug('  --> Remove compartment: ' + str);
    });

    var shadowPanelLocator = By.className('reveal-modal-bg fade in');
    WebDriverCommands.removeShadowPanel( driver, shadowPanelLocator, TIMEOUT);

    var removeBtnLocator = By.xpath('//div[@class="modal-footer"]/button[text() = "Remove"]');
    WebDriverCommands.clickButton( driver, removeBtnLocator, TIMEOUT);

    WebDriverCommands.waitElementStaleness( driver, trashLocator, TIMEOUT);
}

function tearDown() {
    driver.quit();
    webPromise.cancel();
}

module.exports = {

    run : run
}
