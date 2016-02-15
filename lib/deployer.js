var pathFn = require('path');
var fs = require('hexo-fs');
var chalk = require('chalk');
var swig = require('swig');
var moment = require('moment');
var util = require('hexo-util');
var parseConfig = require('./parse_config');
var child_process = require('child_process')
var spawn = util.spawn;
var exec = child_process.exec;

var swigHelpers = {
  now: function(format){
    return moment().format(format);
  }
};

module.exports = function(args){
  var baseDir = this.base_dir;
  var log = this.log;
  var message = commitMessage(args);
  var verbose = !args.silent;

  if (!args.repo && !args.repository){
    var help = '';

    help += 'You have to configure the deployment settings in _config.yml first!\n\n';
    help += 'Example:\n';
    help += '  deploy:\n';
    help += '    type: git\n';
    help += '    repo: <repository url>\n';
    help += '    branch: [branch]\n';
    help += '    message: [message]\n\n';
    help += 'For more help, you can check the docs: ' + chalk.underline('http://hexo.io/docs/deployment.html');

    console.log(help);
    return;
  }

  function git(){
    var len = arguments.length;
    var args = new Array(len);

    for (var i = 0; i < len; i++){
      args[i] = arguments[i];
    }

    return spawn('git', args, {
      cwd: baseDir,
      verbose: verbose
    });
  }

  function push(repo){
    return git('add', '-A').then(function(){
      return git('commit', '-m', message).catch(function(){
        // Do nothing. It's OK if nothing to commit.
      });
    }).then(function(){
      return git('push', '-u', repo.url, 'master:' + repo.branch, '--force');
    });
  }

  function remote_pull(host, wd) {
    var ssh_cmd = 'ssh ' + host;
    var remote_exec_cmd = 'cd ' + wd + ' && git pull && npm install && hexo clean && hexo generate';
    var server_restart_cmd = 
      'kill $(ps -ef | grep hexo | grep -v grep | head -1 | awk \'{print $2}\') ; nohup hexo server > server.log 2>&1 &';
    var cmd = ssh_cmd + ' "' + remote_exec_cmd + " && " + server_restart_cmd + '"';
    return exec(cmd);
  }

  return fs.exists(baseDir).then(function(exist) {
    return parseConfig(args);
  }).each(function(repo) {
    return push(repo);
  }).then(function() {
    var host = "blog@uranux.com";
    var wd = "~/hexo-blog"
    return remote_pull(host, wd);
  });
};

function commitMessage(args){
  var message = args.m || args.msg || args.message || 'Site updated: {{ now(\'YYYY-MM-DD HH:mm:ss\') }}';
  return swig.compile(message)(swigHelpers);
}
