/**
 * Created by pengl on 5/11/2017.
 *
 * Function: Config catalog/categories/catalog Items for one org.
 *
 */

const WebDriverFactory = require('../../util/src/WebdriverFactory');
const WebDriverCommands = require('../../util/src/WebdriverCommands');
const PropelCommands = require('../../util/src/PropelCommands');
const config = require('../../config/config.json');
const By = require('selenium-webdriver').By;
const until = require('selenium-webdriver').until;
const path = require('path');

const PROPEL_SERVER = config.propelServer;
const TIMEOUT = config.propelElementTimeout;
const TIMEOUT_ORGCHECK = config.propelValidLoadingTime;
const CATEGORIES_LIST = config.categoriesList;

var log;
var driver;
var customerJson = {};
var webPromise;

/***********************************************************
 * Main Process
 * 1) Login Propel with Admin Account
 * 2) Read external file for further configuraton
 * 3) Run selenium process:
 * ****** Add 10 Categories
 ***********************************************************/

function run( options ) {

    return new Promise(function(resovle, reject){

        setTraceLevel( options.debug );

        log.info("****** Method: Configure Propel Categories in ProPel ******");

        customerJson = options.customerJson;

        startSelenium( resovle, reject);

    });
}

function startSelenium( resovle, reject ) {

    driver = new WebDriverFactory( config.browser ).driver;

    webPromise = PropelCommands.logInPropel(driver, PROPEL_SERVER, customerJson.urlName, customerJson.propelAccount, customerJson.propelPwd);

    webPromise
            .then( addCategories_12 )
            .then( tearDown )
            .then( function() {

                resovle();
                log.info("===> Config Propel " + CATEGORIES_LIST.length + " Categories Completed <===" );
            })
            .catch( function(err){ //check result

                PropelCommands.takeScreenShot(driver, 'configCategories_snapshot_' + customerJson.urlName);
                //log.error( err);
                tearDown();
                reject( err );
            });
}

function setTraceLevel( debug ){

    const log4js = require('log4js');
    log4js.configure("./config/log4js.json");

    log = log4js.getLogger( debug);
}

function addOneCategory( category ){

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

    var catLocator = By.xpath('//span[contains( text(), "'+ category +'")]');
    driver.findElements( catLocator ).then( function( eleList) {
        if( eleList.length < 1) { //doesn't exist

            log.debug(' Begin to create Category - ' + category);

            PropelCommands.select_default_language( driver );

            var addLocator = By.id('subheader-createSubategory');
            WebDriverCommands.clickButton(driver, addLocator, TIMEOUT);

            var shadowPanelLocator = By.className('reveal-modal-bg fade in');
            WebDriverCommands.removeShadowPanel(driver, shadowPanelLocator, TIMEOUT);

            var nameLocator = By.id('name');
            WebDriverCommands.sendKeysToInputElement(driver, nameLocator, category, TIMEOUT);

            var createLocator = By.id('createButton');
            WebDriverCommands.clickButton(driver, createLocator, TIMEOUT);

            //go back to categories page
            var url = PROPEL_SERVER + ':9500/categories';
            PropelCommands.getPropelUrl( driver, url );

            ///wait for refresh success
            driver.wait(until.elementLocated(By.xpath('//span[text()= "Categories"]')), TIMEOUT);

        } else {
            log.debug(' -> Category - ' + category +' already existed...');
        }
    });
}

function addCategories_12() {

    //go to Categories
    var url = PROPEL_SERVER + ':9500/categories';
    PropelCommands.getPropelUrl( driver, url );
    PropelCommands.waitPageLoading( driver, TIMEOUT );
    driver.wait(until.titleContains('Categories'), TIMEOUT);

    PropelCommands.select_default_language( driver );

    //if existed, ignore; Otherwise, add it.
    for(var i=0; i< CATEGORIES_LIST.length; i++) {
       addOneCategory( CATEGORIES_LIST[i] );
    }
}

function tearDown() {
    driver.quit();
    webPromise.cancel();
}

module.exports = {

    run : run
}
