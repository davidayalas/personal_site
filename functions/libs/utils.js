const https = require('https');

/**
 * Request generic function
 * @param {Object} options can be standard http.request object or include object.url as string
 * @param {Object} || {String} data to write to request
 */
async function request(options, data){
    return new Promise(function(resolve, reject) {
        let _response = {
            statusCode: 200, body : ""
        };
        data = (typeof data==="object") ? JSON.stringify(data) : data;
        const cb = (res) => {
            res.on('data', (d) => _response.body += d.toString());
            res.on('end', () => resolve(_response));
        };
        const req = (typeof options.url==="string") ? https.request(options.url, cb) : https.request(options, cb);
        req.on('error', (error) => {
            _response.statusCode = 500;
            _response.body = error;
            reject(_response);
        });
        req.write(data || '');
        req.end();
    });      
}

exports.request = request;

/** 
 * Git Repo File actions
 * 
 * @param {String} action "push", "del", "get"
 * @param {String} file path of the file to manage
 * @param {String} content for "push"
 * @param {Object} data {"message", "branch", "sha"} > "sha" key for update or delete a file
 * @param {Boolean} true for "push" and update in GITLAB to use PUT instead of POST
 * @param {Object} git_options setup for git request
 */
async function _gitFileAction(action, file, data, content, update, git_options){
  data =  data || {
    "branch": "master", 
  };

  data.branch = data.branch || "master";
  data[git_options.field_message] = data.message || git_options.commit_message;

  if(git_options.git_type==="GITLAB"){
    data.author_email = git_options.author_email;
    data.author_name = git_options.author_email; 
  }

  let options = {
    'hostname': git_options.host,
    'port': 443,
    'headers': {
      'Content-Type': 'application/json'
    }
  };

  switch(action){
    case "push":
      data.content = git_options.git_type==="GITHUB" ? Buffer.from(content).toString("base64") : content;
      options.method = git_options.git_type==="GITLAB" && !update ? "POST" : "PUT";
      break;
    case "del":
      options.method = "DELETE";
      break;
    default:
      options.method = "GET";
  }

  options.headers[git_options.auth_header] = git_options.git_type==="GITLAB" ? git_options.token : "token " + git_options.token;
  options.headers["user-agent"] = git_options.owner;
  options.path = git_options.git_type==="GITHUB" ? `/repos/${git_options.owner}/${git_options.project}/contents/${file}` : `/api/v4/projects/${git_options.project}/repository/files/${encodeURIComponent(file)}?ref=${data.branch}`;
  data = JSON.stringify(data);
  options.headers["content-length"] = data.length;
  return await request(options, data);  
}

/**
 * options {Object}
 *    git_type, "GITLAB" or "GITHUB"
 *    project, id for the project to manage
 *    token, oauth token
 *    [author_email]
 *    [commit_message] default commit message, you can change it in every call
 *    [host] defaults to gitlab or github, but overridedable for hosted git
*/
exports.git = function(options){

    let git_options = options;
    if(!options || !git_options.git_type || !git_options.project || !git_options.token){
      console.log("Invalid options: git_type, project and token are mandatory");
      return {};
    }

    const defaults = {
      author_email : "me@test.com",
      auth_header : git_options.git_type==="GITLAB" ? "PRIVATE-TOKEN" : "Authorization",
      field_message : git_options.git_type==="GITLAB" ? "commit_message" : "message",
      commit_message : git_options.commit_message || "[skip ci] new message",
      host : git_options.host || (git_options.git_type==="GITLAB" ? "gitlab.com" : "api.github.com"),
      method : git_options.git_type==="GITLAB" ? "POST" : "PUT"
    }

    for(let k in defaults){
      if(!git_options[k]){
        git_options[k] = defaults[k];
      }
    }

    let _FileAction = async function(action, file, data, content, update){
        return await _gitFileAction(action, file, data, content, update, git_options);
    }

    return {
        "repo" : {
            //updates or create a file. Does a get request before to setup an update or create
            "put" : async function(file, content, data){
              data = data || {};
              let _file = await _FileAction("get", file);
              _file = JSON.parse(_file.body);
              if(_file && _file.message && _file.message.toLowerCase().indexOf("not found")){
                return await _FileAction("push", file, data, content, false);
              }
              if(git_options.git_type==="GITHUB"){
                data.sha = _file.sha;
              }
              return await _FileAction("push", file, data, content, true);
            },
            "get" : async function(file){
              return await _FileAction("get", file);
            },
            "del" : async function(file, data){
              data = data || {};
              let _file = await _FileAction("get", file);
              _file = JSON.parse(_file.body);
              data.sha = _file.sha;
              return await _FileAction("del", file, data);
            }
        }
    }
};

