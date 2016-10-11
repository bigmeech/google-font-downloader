#!/usr/bin/env node
'use strict';

//todo: impliment limitation
const rp = require('request-promise');
const download = require('download');
const fs = require('fs');
const jsonfile = require('jsonfile');
const path = require('path');
const mkdirp = require('mkdirp');
const _ = require('lodash');
const argv = require('yargs')
    .usage('USAGE: $0 <options>\n\nDownload fonts from Google Font API')
    .options('key', {
      alias: 'k',
      describe: 'Your google developer api key',
      required: true,
      requiresArg: true,
      type: 'string'
    })
    .options('outputDir', {
      alias: 'd',
      describe: 'Directory to dump files',
      required: true,
      requiresArg: true,
      type: 'string'
    })
    .options('limit', {
      alias: 'l',
      describe: 'Number to download',
      required: false,
      requiresArg: false,
      type: 'number'
    })
    .help()
    .strict()
    .argv;


/**
 * sort fonts by family before download
 * @param a
 * @param b
 * @returns {number}
 */
function sortFonts(a,b){
  var familyA = a.family.toUpperCase(); // ignore upper and lowercase
  var familyB = b.family.toUpperCase(); // ignore upper and lowercase
  if (familyA < familyB) {
    return -1;
  }
  if (familyA > familyB) {
    return 1;
  }
  // names must be equal
  return 0;
}

function downloadAndSaveFont(folderPath, options, item, index){
  if (index > options.limit) { return }
  const familyDump = `${folderPath}/${item.family}`;
  try {
    mkdirp.sync(familyDump);
    _.forIn(item.files, function (url, fontStyle) {
      const dumpPath = `${familyDump}/${fontStyle}.ttf`;
      download(url).pipe(fs.createWriteStream(dumpPath))
          .on('finish', () => {
            console.log(`${url} download finished`)
          })
          .on('close', () => {
            console.log(`${url} downloaded to ${dumpPath}`)
          });
    });
  } catch (e) {
    console.error(e.message)
  }
}
/**
 * process request
 * @param options
 * @param folderPath
 * @param response
 */
function processRequest(folderPath, options, response) {
  console.log('Found', response.body.items.length, 'webfonts');
  response.body.items
      .sort(sortFonts)
      .forEach(downloadAndSaveFont.bind(null, folderPath, options));
}

(function (args) {
  const dumpPath = path.resolve(__dirname, '../' + args.outputDir);
  try {
    mkdirp.sync(dumpPath);
    const rOptions = {
      uri: 'https://www.googleapis.com/webfonts/v1/webfonts',
      qs: {key: args.key, limit: args.limit},
      headers: {referer: 'localhost'},
      json: true,
      resolveWithFullResponse: true
    };
    rp(rOptions)
        .then(processRequest.bind(null, dumpPath, args))
        .catch(function (error) {
          console.log(error)
        })
  } catch (e) {
    console.log(e);
  }
}).call(null, argv);