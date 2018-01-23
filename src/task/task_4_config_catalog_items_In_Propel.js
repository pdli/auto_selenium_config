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

var catalogItemList = config.catalogItems.slice();

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

        //init values
        setTraceLevel( options.debug );

        log.info("****** Method: Configure "+ catalogItemList.length +" Catalog Item/Items in ProPel ******");

        customerJson = options.customerJson;

        startSelenium( resovle, reject);
    });
}

function startSelenium( resovle, reject ) {

    driver = new WebDriverFactory( config.browser ).driver;

    webPromise = PropelCommands.logInPropel(driver, PROPEL_SERVER, customerJson.urlName, customerJson.propelAccount, customerJson.propelPwd);

    webPromise
            .then( updateRequiredCIList )
            .then( addCatalogItems )
            .then( saveConfigurationResult )
            .then( function () {

                PropelCommands.tearDown( driver, webPromise );
            })
            .then( function() {

                resovle();
                log.info("===> Configure "+ catalogItemList.length +" Catalog Item/Items Completed <===" );
            })
            .catch( function( err ){

                PropelCommands.takeScreenShot(driver, "configCI_snapshot_" + customerJson.urlName);
                PropelCommands.tearDown( driver, webPromise );

                reject( err );
            });
}

function setTraceLevel( debug ){

    const log4js = require('log4js');
    log4js.configure("./config/log4js.json");
    log = log4js.getLogger( debug);
}

function saveConfigurationResult() {

    var url = PROPEL_SERVER + ':9010/shop/catalog';
    PropelCommands.getPropelUrl( driver, url );
    driver.wait( until.titleContains('Shop for Services'), TIMEOUT).then( function () {

        log.info(' => Take screen shot after CI completion');
    });

    waitForItemPageLoading();

    PropelCommands.takeScreenShot( driver, 'configCatalog_completion_snapshot_' + customerJson.urlName );
}

//remove Catalog Item if it has been published
function updateRequiredCIList() {

    //go to Published Items Web Page
    var url = PROPEL_SERVER + ':9500/items?sortBy=timestamp:desc&template=false&language=en';
    PropelCommands.getPropelUrl( driver, url );

    PropelCommands.waitPageLoading( driver, TIMEOUT );
    driver.wait(until.titleContains('Catalog Items'), TIMEOUT);

    var noItemFoundLocator = By.xpath('//div[contains(text(), "No items found")]');
    driver.wait(until.elementIsVisible( driver.findElement( noItemFoundLocator )), TIMEOUT_ORGCHECK).then(function () {

        //No item published before, go on to publish CI,
        //Otherwise, published items will not be published again.
    }, function () {

        var publishedItemsLocator = By.xpath('//div[@class="small-10 medium-7 column"]//span[@class="ng-binding"]');
        driver.findElements( publishedItemsLocator).then( function ( elements ) {

            for( var i=0; i< elements.length; i++){
                elements[i].getText().then( function ( str ) {

                    log.debug("  --> "+ str +" CI already published, it will NOT be published." );
                    var index = catalogItemList.findIndex(x => x.hasOwnProperty( str ));
                    if( index != -1 ){
                        catalogItemList.splice(index, 1);
                    }
                });
            }
        })
    });
}

function removeShadowPanel() {

    //set invisible
    var panelLocator = By.className('reveal-modal-bg fade in');
    driver.wait(until.elementLocated( panelLocator ), TIMEOUT);
    driver.executeScript('var x = document.getElementsByClassName("reveal-modal-bg fade in");' +
            ' x[0].style = "display: none;display: none"');
}

function addOneCategory_inCatalogItem( category ) {

    var addItemLocator = By.id('selectCategory');
    WebDriverCommands.clickButton( driver, addItemLocator, TIMEOUT );

    removeShadowPanel();

    var categoryLocator = By.xpath('(//ul[@id="containerList"]//span[text() = "'+ category +'"])[1]');
    driver.wait(until.elementLocated( categoryLocator ), TIMEOUT).then( function () {
        log.debug('  Category will be added -- ' + category );
    });
    WebDriverCommands.clickButton( driver, categoryLocator, TIMEOUT);

    var okLocator = By.id('ok');
    WebDriverCommands.clickButton( driver, okLocator, TIMEOUT);

    //wait for added completion
    var itemLocator = By.xpath('//span[@title = "'+ category +'"]//span[text()="'+ category +'"]');
    WebDriverCommands.waitElementLocated( driver, itemLocator, TIMEOUT);
}

function waitForItemPageLoading() {

    //wait for page loading
    var progressLocator = By.id('loading-bar-spinner');
    WebDriverCommands.waitElementStaleness( driver, progressLocator, TIMEOUT);

    var loadingBarLocator = By.id('loading-bar');
    WebDriverCommands.waitElementStaleness( driver, loadingBarLocator, TIMEOUT);
}

function  addOneCatalogItem( catalogItem ) {

    //get item name
    var itemName = Object.keys(catalogItem).pop();
    var delItem = catalogItem[itemName][0]; //only the 1st item should be deleted
    var addItems = catalogItem[itemName].slice(1); //the others should be added

    waitForItemPageLoading();

    //click item
    var itemLocator = By.xpath('//span[text() = "'+ itemName +'"]');
    driver.wait(until.elementLocated( itemLocator ), TIMEOUT).then( function () {
        log.info(' => Begin to add Catalog Item -- ' + itemName);
    });
    WebDriverCommands.clickButton( driver, itemLocator, TIMEOUT);

    var editLocator = By.id('editButton');
    WebDriverCommands.clickButton( driver, editLocator, TIMEOUT);

    //remove default categories
    var defaultLocator = By.xpath('//span[contains(@title, "'+ delItem +'")]//I');
    driver.findElements( defaultLocator ).then( function( eleList){
        if(eleList.length > 0){
            eleList[0].click();
        }
    }).then( function () {
        log.debug("  Delete Item completed -- " + delItem);
    });

    //add categories for one catalog Item
    for( var i=0; i<addItems.length; i++){

        addOneCategory_inCatalogItem( addItems[i] );
    }


    //save categories
    var saveLocator = By.id('saveButton');
    WebDriverCommands.clickButton(driver, saveLocator, TIMEOUT);

    PropelCommands.waitPageLoading( driver, TIMEOUT);

    //wait for saved
    var savedLocator = By.xpath('//span[text() = "Saved"]');
    WebDriverCommands.waitElementAvailable(driver, savedLocator, TIMEOUT);
    PropelCommands.waitPageLoading(driver, TIMEOUT);

    //go to access control panel
    driver.getCurrentUrl().then( function ( url ) {
        PropelCommands.getPropelUrl( driver, url + '/access');
    })

    waitForItemPageLoading();

    var grantedLocator = By.xpath('//td[contains(text(), "Propel Users")]');
    driver.wait(until.elementLocated( grantedLocator ), TIMEOUT_ORGCHECK).then(
            function(){

                log.debug('  Access control for Propel Users already done...');
            }, function grantAccess() {

                var grantLocator = By.xpath('//button[text() = "Grant access"]');
                WebDriverCommands.clickButton( driver, grantLocator, TIMEOUT);

                removeShadowPanel();

                var optionLocator = By.xpath('//select[@id = "group"]/option[text() = "Propel Users"]');
                WebDriverCommands.clickButton( driver, optionLocator, TIMEOUT);

                var submitLocator = By.xpath('//button[text() = "Grant Access"]');
                WebDriverCommands.clickButton( driver, submitLocator, TIMEOUT).then( function () {

                    log.debug("  Access control for Propel Users is done");
                });

                waitForItemPageLoading();

                //wait for completion
                //driver.wait(until.elementLocated( grantedLocator ), TIMEOUT );
            }
    );

    //publish catalog item
    var publishLocator = By.id('publishItem');
    WebDriverCommands.clickButton( driver, publishLocator, TIMEOUT );

    waitForItemPageLoading();

    //wait for publish options loading
    var publishItemLocator = By.xpath('//h3[text() = "Publish item to catalog"]');
    WebDriverCommands.waitElementLocated( driver, publishItemLocator, TIMEOUT_ORGCHECK );

    var mvpcLocator = By.xpath('//select[@id = "catalog"]/option[text() = "Managed Virtual Private Cloud"]');
    driver.wait(until.elementLocated( mvpcLocator ), TIMEOUT_ORGCHECK).then(
            function publishNow( ) {

                WebDriverCommands.clickButton( driver, mvpcLocator, TIMEOUT);
                WebDriverCommands.clickButton( driver, By.id('publish'), TIMEOUT);

                //wait for completion of publish
                WebDriverCommands.waitElementLocated( driver, By.id('unpublishItem'), TIMEOUT).then( function () {

                    log.debug("  Item is published in MVPC Catalog");
                });

            }, function doneBefore(){

                //No Catalogs for publishing Item
                var cancelLocator = By.xpath('//a[text() = "×"]');
                driver.findElement( cancelLocator ).click().then( function () {
                    log.debug("  Item already published in MVPC Catalogs...");
                });
            }
    );
}

//work round due to service available
function gotoCIpage(){

    //go to Catalog Items page
    var url = PROPEL_SERVER + ':9500/items';
    PropelCommands.getPropelUrl( driver, url );
    driver.wait(until.titleContains('Catalog Items'), TIMEOUT);
}

function addCatalogItems() {

    for(var i=0; i<catalogItemList.length; i++){

        gotoCIpage();

        addOneCatalogItem( catalogItemList[i] );
    }
}

module.exports = {

    run : run
}
