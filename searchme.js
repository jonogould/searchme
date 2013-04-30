#!/usr/bin/env node

/*
*	searchme.js
*	========================================================
*
*	Author: 	jono gould
*	Company: 	TravelGround.com
*	Date: 		30 April 2013
*
*	Description:
*	searchme uses the asynchronous function walkme to search
*	through a root directory, finding any file that is not
*	called at least once.
*
*	========================================================
*	
*	Usage:
*	searchme.js -s {$root_dir} -v -d {$search_term1, $search_term2, $search_term3}
*
*	Returns = array of objects (filename, full path)
*
*	dir 	= root folder
*	done 	= callback that is triggered on completion
*/


//	Load dependencies
var fs = require('fs');
var app = require('commander');
var shell = require('shelljs');
var _ = require('underscore');
var clc = require('cli-color');

//	Homemade dependencies
var awalk = require('awalk').awalk;
var utils = require('utils');


/*
*	Yes, Commander!
*/

app
	.version('0.1')
	.option('-s, --source [path]', 'specify the root directory (optional, defaults to pwd)')
	.option('-v, --verbose', 'be verbose with the output', false)
	.option('-d, --deprecate', 'adds _DEPRECATED and the date to an unused file', false)
	.parse(process.argv);	//	These are the search terms

//	Display the help and quit if there are no search terms (arguments)
if (app.args.length === 0) {
	app.help();
	process.exit(1);
}


/*
*	GLOBAL OPTIONS
*/

var verbose = (app.verbose) ? true : false;
var deprecate = (app.deprecate) ? true : false;
var begin_time = new Date();
var files_in_root = 0;

//	Paths
var root = (app.source) ? app.source : shell.pwd();

//	Just get the filenames and paths of files in the searched dir using simplewalk
var search_list = [];
_.each(app.args, function (f) {
	_.each(utils.simplewalk(f), function(sf) {
		search_list.push(sf);
	});
});


/*
*	Start the console stuff
*/

console.log(clc.xterm(113)('======================================================================'));

console.log('\n' + clc.xterm(113).bold('RECURSIVE "IS-FILE-IN-USE" SEARCHER'));
console.log('\nRoot dir: \t\t\t' + clc.xterm(113)(root));
console.log('Search term' + ((app.args.length > 1) ? 's' : '') + ': \t\t\t' + clc.xterm(113)(((app.args.length > 2) ? '\n' : '') + app.args + ((app.args.length > 2) ? '\n' : '')));
console.log('Number files in source: \t' + clc.xterm(113)(search_list.length));
console.log('Start time: \t\t\t' + clc.xterm(113)(begin_time.getHours() + ':' + begin_time.getMinutes() + ':' + begin_time.getSeconds()));

console.log(clc.xterm(113)('\n======================================================================'));


/*
*	Start the walk
*/

awalk(root, function(err, results) {
	//	Some defaults
	var count = 0;
	var not_found = [];
	files_in_root = results.length;

	//	Now iterate through the list of searched items
	_.each(search_list, function(sf) {
		//	Ignore deprecated
		if (sf.file.indexOf('_DEPRECATED') > -1) {
			count++;
			return;
		}

		var start_time = new Date();

		//	Give an idea of what is being searched right now
		console.log('\n' + clc.blue.bold(++count) + ' / ' + search_list.length)
		if (verbose) console.log('Search term \t' + clc.underline(sf.file));
		var search_found = false;

		//	Check through the list of root files for the search term
		_.some(results, function(f) {
			if (fs.existsSync(f.path)) {
				//	Exclude some folders, add your own?
				if(f.path.indexOf('DEPRECATED') < 0 && f.path.indexOf('ajax') < 0 && f.path.indexOf('img') < 0 && f.path.indexOf('blog') < 0 && f.path.indexOf('sitemap.xml') < 0 && f.path.indexOf('.git') < 0) {
					//	Do the search and record the findings
					var found = utils.search(sf.file, f.path).result;

					if (found) {
						search_found = true;
						if (verbose) console.log('Match ' + clc.xterm(113).bold('√') + ' \tFound in ' + clc.xterm(113)(f.path));
						return true;
					}
				}
			}
		});

		//	If the term was not found, tell us
		if (!search_found) {
			not_found.push(sf);
			console.log(clc.xterm(9)('NO MATCH \t' + sf.path) + ' not in use');

			//	Rename the file, if depreciated is turned on and file isnt already depreciated
			if (deprecate & sf.path.indexOf('DEPRECATED') < 0) {
				var newfile = sf.path.substring(0, sf.path.lastIndexOf('.')) + '_DEPRECATED_' + begin_time.getFullYear() + '_' + (begin_time.getMonth()+1) + '_' + begin_time.getDay();
				newfile += sf.file.substring(sf.file.lastIndexOf('.'));
				//	Move it brova!
				shell.mv(sf.path, newfile);

				if (verbose) console.log('Renamed \tFile is now called ' + clc.underline(newfile));
			}
		}

		//	Record the time taken etc
		console.log('Time taken\t' + utils.timing(start_time, new Date()));
	});

	/*
	*	Give a summary of the search
	*/
	
	console.log(clc.xterm(113)('\n\n======================================================================\n'));

	console.log('TOTAL TIME TAKEN:\t\t\t' + utils.timing(begin_time, new Date()) + '\n');
	console.log('Number of files in root:\t\t' + files_in_root);
	console.log('Number of unused files:\t\t\t' + not_found.length);
	console.log('Percentage unused:\t\t\t' + (Math.round((not_found.length/files_in_root*100)*100)/100) + '%\n');

	console.log('LIST OF UNUSED FILES:');

	//	List unused files
	if (not_found.length === 0) {
		console.log(clc.xterm(113)('No unsed files, woohoo!'));
	}
	else {
		_.each(not_found, function(nf) {
			console.log(clc.red.bold(nf.path));
		});
	}
});