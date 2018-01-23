/**
 * Created by pengl on 12/08/2017.
 * Terminology:
 * *** primaryData: data distilled from QRS
 * *** ResumeRun:It is only for catalog configuration,
 *               all tenants info will be saved in resumeRun.json
 * ***
 */
const io = require('selenium-webdriver/io');

var getPathOfPrimaryDataJsonFile = function( tenantID ) {

    //format: 100123_primaryDataFromQRS
    var suffixOfPrimaryDataJsonFile = "primaryDataFromQRS.json";

    return './file/' + tenantID + '_' + suffixOfPrimaryDataJsonFile;
}

var getPathOfResumeRunJsonFile = function ( ) {

    return './file/resumeRun.json';
}

var writeToPrimaryDataStorage = function( cusInfoObj ){

    var aPath =  getPathOfPrimaryDataJsonFile( cusInfoObj.tenantID );
    var data = JSON.stringify( cusInfoObj );

    return io.write( aPath, data);
}

var getParamFromPrimaryDataStorageInJson = function ( tenantID, args ) {

    //convert dynamic arguments to args Array
    args = Array.prototype.slice.call(arguments, 1);

    //return Promise
    return new Promise( function ( resolve, reject) {

        var aPath = getPathOfPrimaryDataJsonFile( tenantID );

        io.read( aPath )
            .then( function (buffer) {

                var data = JSON.parse( buffer );

                //construct json
                var json={};
                for( var i=0; i< args.length; i++){
                    json[args[i]]= data[args[i]];
                }

                //return json
                resolve( json);
            })
            .catch( function ( error ) {

                reject( error );
            });
    });
}

var updateResumeRunByTenantId = function ( tenantID, resumeStep=0 ) {

    var aPath = getPathOfResumeRunJsonFile();

    io.read( aPath )
        .then( function (buffer){

            var data = JSON.parse( buffer );

            //tenantID is undefined
            if( tenantID === undefined ) {
                throw new Error(" Tenant ID is undefined. It will not be updated in resumeRun.json");
            }
            //new record
            if( data[tenantID] === undefined ) {

                data[tenantID] = {};
            }
            //update data in jSON
            data[tenantID].resumeStep = resumeStep;

            return data;
        })
        .then( function(data){

            var buffer = JSON.stringify( data );
            io.write( aPath, buffer)
                .catch( function (err) {
                    throw err;
                });
        })
        .catch( function (err) {
            throw err;
        });
}

var getParamFromResumeRun = function ( tenantID, args ) {

    //convert dynamic arguments to args Array
    args = Array.prototype.slice.call(arguments, 1);

    //return Promise
    return new Promise( function ( resolve, reject) {

        var aPath = getPathOfResumeRunJsonFile();

        io.read( aPath )
            .then( function (buffer) {

                var data = JSON.parse( buffer );

                if( data[tenantID] === undefined){

                    resolve( data[tenantID]);
                } else {

                    //construct json
                    var json={};
                    for( var i=0; i< args.length; i++){
                        json[args[i]]= data[tenantID][args[i]];
                    }
                    //return json
                    resolve( json);
                }
            })
            .catch( function ( error ) {

                reject( error );
            });
    });
}


module.exports = {
    getPathOfPrimaryDataJsonFile : getPathOfPrimaryDataJsonFile,
    getParamFromPrimaryDataStorageInJson : getParamFromPrimaryDataStorageInJson,
    writeToPrimaryDataStorage : writeToPrimaryDataStorage,
    updateResumeRunByTenantId : updateResumeRunByTenantId,
    getParamFromResumeRun: getParamFromResumeRun,
}
