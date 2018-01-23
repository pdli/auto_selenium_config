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

console.time("Clear Catalog");
/***********************************************************
 * Main Process
 * 1) Login Propel with Admin Account
 * 2) Read external file for further configuraton
 * 3) Run selenium process:
 * ****** Delete Suppliers: MPC, SMC
 * ****** Delete MVPC
 * ****** Delete 10 Categories
 ***********************************************************/

function run( options ) {

    return new Promise(function(resovle, reject){

        setTraceLevel( options );

        customerJson = options.customerJson;

        log.info( "****** Step - 6: Clear Config for Propel Catalog & CI & Aggregation in ProPel : " + customerJson.urlName + " ******");

        startSelenium(resovle, reject);
    });
}


function startSelenium( resovle, reject ) {

    driver = new WebDriverFactory( config.browser ).driver;

    webPromise = PropelCommands.logInPropel( driver, PROPEL_SERVER, customerJson.urlName, customerJson.propelAccount, customerJson.propelPwd );

    webPromise
            .then( deleteSuppliers )
            .then( removeCatalogs_MVPC )
            .then( deleteCategories )
            .then( tearDown )
            .then( function() {

                resovle();
                log.info("===> Clear Configuration completed <===");
                console.timeEnd("Clear Catalog");
            })
            .catch( function(err){ //check result

                PropelCommands.takeScreenShot(driver, "clearConfig_snapshot_" + customerJson.urlName);
                log.error( err);
                tearDown();

                console.timeEnd("Clear Catalog");

                reject( err );
            });
}


function setTraceLevel( options ){

    const log4js = require('log4js');
    log4js.configure("./config/log4js.json");
    log = log4js.getLogger( options.debug);
}

function deleteOneCategory( ){

    var categoryLocator = By.xpath('//div[@class="list-item-content"][last()]//span');
    driver.wait(until.elementLocated( categoryLocator ), TIMEOUT_ORGCHECK).then( function() {

        driver.findElement( categoryLocator ).getText().then( function ( str ) {

            log.debug("  --> Delete Category: " + str );
        });
        WebDriverCommands.clickButton(driver, categoryLocator, TIMEOUT);

        var waitLocator = By.xpath('//h4[text() = "Details"]');
        WebDriverCommands.waitElementLocated(driver, waitLocator, TIMEOUT);

        var deleteLocator = By.id('removeCategory');
        WebDriverCommands.clickButton(driver, deleteLocator, TIMEOUT);

        var okLocator = By.id('confim-modal-yes');
        WebDriverCommands.clickButton(driver, okLocator, TIMEOUT);

        PropelCommands.waitPageLoading( driver, TIMEOUT);

    }, function(){

        log.debug('  --> Categories already deleted -- ' + category);
    });
}

function deleteCategories() {

    //go to Categories
    var url = PROPEL_SERVER + ':9500/categories';
    PropelCommands.getPropelUrl( driver, url );
    driver.wait(until.titleContains('Categories'), TIMEOUT);

    //wait for full page loading in Categories
    var resultLocator = By.xpath('//span[contains(text(), " result")]');
    driver.wait(until.elementLocated( resultLocator), TIMEOUT).then( function ( elem ) {
        driver.findElement( resultLocator ).getText().then( function (x) {
            if( x !== "0 results") {
                var itemLocator = By.className('list-item-left mr');
                driver.wait(until.elementLocated( itemLocator ), TIMEOUT);
            }
        })
    });

    var categoriesLocator = By.className('list-item-content');
    driver.findElements( categoriesLocator ).then( function ( elements ) {

        log.debug('==> Begin to remove categories: '+ elements.length );

        for( var i=0; i< elements.length; i++){

            deleteOneCategory();
        }
    });
}

function removeOneSupplier( ) {

    var supplierLocator = By.xpath('//div[@class = "list-item-content flex-vertical-center"]' +
        '//div[@class = "small-8 medium-6 column"]//a[last()]');
    WebDriverCommands.waitElementAvailable( driver, supplierLocator, TIMEOUT);

    driver.findElement( supplierLocator ).getText().then( function( str ){
        log.debug('  --> Remove supplier: ' + str);
    });
    WebDriverCommands.clickButton( driver, supplierLocator, TIMEOUT );

    PropelCommands.waitPageLoading( driver, TIMEOUT );

    PropelCommands.waitLoadingPanelDisappear( driver, TIMEOUT);

    var editLocator = By.id('edit-provider-button');
    WebDriverCommands.waitElementAvailable( driver, editLocator, TIMEOUT);

    //Delete
    var dropDownLocator = By.xpath('//a[@dropdown-toggle="#instance-menu"]');
    WebDriverCommands.clickButton(driver, dropDownLocator, TIMEOUT);

    var deleteLocator = By.id('instance-delete-link');
    WebDriverCommands.clickButton(driver, deleteLocator, TIMEOUT);

    PropelCommands.waitPageLoading( driver, TIMEOUT);

    var shadowPanelLocator = By.className('reveal-modal-bg fade in');
    WebDriverCommands.removeShadowPanel(driver, shadowPanelLocator, TIMEOUT);

    var okLocator = By.id('confirm-modal-yes');
    WebDriverCommands.clickButton(driver, okLocator, TIMEOUT);

    PropelCommands.waitPageLoading( driver, TIMEOUT );
}

function goToSuppliers() {

    var url = PROPEL_SERVER + ':9400/suppliers';
    PropelCommands.getPropelUrl( driver, url );
    driver.wait(until.titleContains('Suppliers'), TIMEOUT);
}

function deleteSuppliers() {

    goToSuppliers();

    var supplierLocator = By.xpath('//div[@class = "list-item-content flex-vertical-center"]' +
        '//div[@class = "small-8 medium-6 column"]//a');

    driver.findElements( supplierLocator ).then( function ( elements ) {

        log.debug('==> Begin to remove suppliers: '+ elements.length );
        for (var i=0; i< elements.length; i++){

            removeOneSupplier();
        }
    });
}

function removeCatalogs_MVPC() {

    //goto catalogs
    var url = PROPEL_SERVER + ':9500/catalogs';
    PropelCommands.getPropelUrl( driver, url );
    driver.wait(until.titleContains('Catalogs'), TIMEOUT).then( function () {

        log.debug('==> Begin to remove catalogs MVPC');
    });

    //Delete Catalog
    var existedCatalogLocator = By.xpath('//span[text()="Managed Virtual Private Cloud"]');
    driver.wait(until.elementLocated(existedCatalogLocator), TIMEOUT_ORGCHECK).then(
            function () {

                //Delete Catalog
                var existedCatalogLocator = By.xpath('//span[text()="Managed Virtual Private Cloud"]');
                WebDriverCommands.clickButton(driver, existedCatalogLocator, TIMEOUT);

                var removeLocator = By.id('removeCatalog');
                WebDriverCommands.clickButton(driver, removeLocator, TIMEOUT);

                var okLocator = By.id('confim-modal-yes');
                WebDriverCommands.clickButton(driver, okLocator, TIMEOUT).then( function () {

                    log.debug('  --> Catalogs MVPC is deleted.');
                });
            }, function () {
                log.debug('  --> MVPC catalog already deleted...');
            }
    );
}

function tearDown() {
    driver.quit();
    webPromise.cancel();
}

module.exports = {

    run : run
}
