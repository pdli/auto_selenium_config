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
const WebElementPromise = require('selenium-webdriver').WebElementPromise;
const path = require('path');

const PROPEL_SERVER = config.propelServer;
const TIMEOUT = config.propelElementTimeout;
const TIMEOUT_ORGCHECK = config.propelValidLoadingTime;

var log;
var driver;
var customerJson = {};
var webPromise;
/***********************************************************
 * Main Process
 * 1) Login Propel with Admin Account
 * 2) Read external file for further configuraton
 * 3) Run selenium process:
 * ****** Add MVPC
 ***********************************************************/

function run( options ) {

    return new Promise(function(resovle, reject){

        setTraceLevel( options.debug );

        log.info("****** Method: Configure MVPC Catalog in ProPel ******");

        customerJson = options.customerJson;

        startSelenium( resovle, reject);

    });
}

function startSelenium( resovle, reject ) {

    driver = new WebDriverFactory( config.browser ).driver;

    webPromise = PropelCommands.logInPropel(driver, PROPEL_SERVER, customerJson.urlName, customerJson.propelAccount, customerJson.propelPwd);

    webPromise
            .then( function () {
                addCatalogs_MVPC();
            })
            .then( function () {
                tearDown();
            })
            .then( function() {

                resovle();
                log.info("===> Configure MVPC Catalog Completed <===" );
            })
            .catch( function(err){ //check result

                PropelCommands.takeScreenShot(driver, "configMVPC_snapshot_" + customerJson.urlName);
                //log.error( err);
                tearDown();
                reject(err);
            });
}

function setTraceLevel( debug ){

    const log4js = require('log4js');
    log4js.configure("./config/log4js.json");

    log = log4js.getLogger( debug);
}

function createMVPC() {

    const CATALOG_NAME = "Managed Virtual Private Cloud";

    var addLocator = By.id('createCatalog');
    WebDriverCommands.clickButton( driver, addLocator, TIMEOUT );

    var nameLocator = By.id('dialogNameText');
    WebDriverCommands.sendKeysToInputElement( driver, nameLocator, CATALOG_NAME, TIMEOUT );

    var okLocator = By.id('dialogCreateButton');
    WebDriverCommands.clickButton( driver, okLocator, TIMEOUT );

    PropelCommands.waitPageLoading( driver, TIMEOUT );

    var catalogNameLocator = By.xpath('//span[text()="'+ CATALOG_NAME +'"]');
    WebDriverCommands.waitElementAvailable( driver, catalogNameLocator, TIMEOUT);

    //Access Control
    var accessLocator = By.xpath('//a[text() = "Access Control"]');
    WebDriverCommands.clickButton( driver, accessLocator, TIMEOUT );

    PropelCommands.waitPageLoading( driver, TIMEOUT );

    var grantLocator = By.xpath('//button[text() = "Grant access"]');
    WebDriverCommands.clickButton( driver, grantLocator, TIMEOUT);

    var selectLocator = By.xpath('//select[@id = "group"]/option[text() = "Propel Users"]');
    WebDriverCommands.clickButton( driver, selectLocator, TIMEOUT );

    var grantAccessLocator = By.xpath('//button[text() = "Grant Access"]');
    WebDriverCommands.clickButton( driver, grantAccessLocator, TIMEOUT );

    PropelCommands.waitPageLoading( driver, TIMEOUT );

    //wait for completion
    var accessCfgLocator = By.xpath('//td[@class = "ng-binding" and contains(text(), "Propel Users")]');
    WebDriverCommands.waitElementAvailable( driver, accessCfgLocator, TIMEOUT );

    //double check
    WebDriverCommands.waitElementAvailable( driver, catalogNameLocator, TIMEOUT);
}

function select_default_language() {

    //select Default Language
    var langLocator = By.xpath('//h3[text()="Select Default Language"]');
    driver.wait(until.elementLocated(langLocator), TIMEOUT_ORGCHECK).then(
            function selectLanguage() {
                driver.findElement(By.id('submit')).click();
            }, function existed() {
                log.debug(' -> Set default Language already.');
            });
}

function addCatalogs_MVPC() {

    //goto catalogs
    var url = PROPEL_SERVER + ':9500/catalogs';
    PropelCommands.getPropelUrl( driver, url );
    PropelCommands.waitPageLoading( driver, TIMEOUT );

    //wait for page loading completion
    driver.wait( until.titleContains('Catalogs'), TIMEOUT);

    select_default_language();

    //Add Catalog
    var existedCatalogLocator = By.xpath('//span[text()="Managed Virtual Private Cloud"]');
    driver.wait(until.elementLocated( existedCatalogLocator ), TIMEOUT_ORGCHECK).then(
            function existed(){

                log.debug(" Catalogs MVPC is already created. Ignore this step.");

            }, function create() {

                log.debug(" Create Catalogs MVPC...");
                createMVPC();
            });
}

function tearDown() {
    driver.quit();
    webPromise.cancel();
}

module.exports = {

    run : run
}
