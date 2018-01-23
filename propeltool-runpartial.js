#!/usr/bin/env node --harmony


const extract = require('./src/step_1_extract_info_In_QRS');
const collaborate = require('./src/step_4_generate_JSON_files');
const add = require('./src/step_2_create_account_In_WorkDirectorys');
const assign = require('./src/step_3_assign_account_In_QRS');
const create = require('./src/step_5_create_url_In_Propel');
const configCatalog = require('./src/step_7_config_one_customer_In_Propel');
const clearConfig = require('./src/step_6_delete_config_categories_In_Propel');

var program = require('commander');

program
        .option('-t, --tenantID <tenant ID>', 'tenant ID of customer')
        .option('-R, --reRun', 'flag to reRun all configurations')
        .option('-x, --username <QRS username>', 'account to login QRS system')
        .option('-P, --password <QRS password>', 'password to login QRS system')
        .option('-J, --billingID <jBilling Customer ID>', 'jBilling ID is required, default: 123456', /\d*/)
        .option('-D, --debug [trace|debug|info|warn|error]', 'enable debug mode', /trace|debug|info|warn|error/i, 'info')
        .parse(process.argv);

var pkgs = program.args;

//if (!pkgs.length) {
if(program.tenantID === undefined){
    console.error('Error: tenant ID required');
    process.exit(1);
}

/*
if(program.username === undefined){
    console.error("Error: username of QRS is required. -x [QRS username] is missing...");
    process.exit(1);
}

if(!program.password){
    console.error('Error: password of QRS is required. -P [QRS password] is missing...');
    process.exit(1);
}
*/

if(!program.billingID){
    console.error('Error: jBilling Customer ID is required. -J [jBilling Customer ID] is missing...');
    process.exit(1);
}

//Beging to run ALL
console.time("PropelRunPartial");
console.log("***************************************************************************");
console.log("************************ Run Partial in One Step **************************");
console.log("************** Inc: Fetch + Create Service Account + Create URL ***********");
console.log("************************* W/O: Run configCatalog **************************");
console.log("***************************************************************************");

var promise =  extract.run( program );

promise
        .then( function() {

            return collaborate.run( program );
        })
        .then( function() {

            var data = collaborate.data();
            data.debug = program.debug;
            return add.run( data );
        })
        .then( function() {

            var data = collaborate.data();
            data.debug = program.debug;
            return assign.run( data );
        })
        .then( function() {
            var propelUploadJson = collaborate.propelUploadJson();
            program.data = propelUploadJson;
            return create.run( program );
        })
        .then( function() {

            console.log("~~ runPartial Finished ~~");
            console.timeEnd('PropelRunPartial');
        })
        .catch( function(err) {

            console.log("XXXXXXXXX runPartial is Failed XXXXXXXXXXXXXX");
            console.log("" + err);
            console.timeEnd('PropelRunPartial');
        });


