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

/** 
 * Git actions
 * 
 * @param {String} action "push", "del", "get"
 * @param {String} file path of the file to manage
 * @param {Object} data {"message", "branch", "sha"} > "sha" key for update or delete a file
 * @param {String} content for "push"
 * @param {Boolean} true for "push" and update in GITLAB to use PUT instead of POST
 */
async function git(action, file, data, content, update){
  update = update || false;
  const git_type = process.env.GIT_TYPE && process.env.GIT_TYPE.toUpperCase()==="GITLAB" ? "GITLAB" : "GITHUB";
  const project = process.env.GIT_PROJECTID;
  const owner = process.env.GIT_OWNER || "me@test.com";
  const author_email = process.env.GIT_AUTHOR || owner;
  const token = git_type==="GITLAB" ? process.env.GIT_TOKEN : "token " + process.env.GIT_TOKEN ;
  const auth_header = git_type==="GITLAB" ? "PRIVATE-TOKEN" : "Authorization";
  const field_message = git_type==="GITLAB" ? "commit_message" : "message";
  const commit_message = process.env.GIT_MESSAGE || "[skip ci] new message";
  const host = process.env.GIT_HOST || (git_type==="GITLAB" ? "gitlab.com" : "api.github.com");
  const method = git_type==="GITLAB" && !update ? "POST" : "PUT";

  data =  data || {
    "branch": "master", 
  };

  data.branch = data.branch || "master";
  data[field_message] = data.message || commit_message;

  if(git_type==="GITLAB"){
    data.author_email = author_email;
    data.author_name = author_email; 
  }

  let options = {
    'hostname': host,
    'port': 443,
    'headers': {
      'Content-Type': 'application/json'
    }
  };

  switch(action){
    case "push":
      data.content = git_type==="GITHUB" ? Buffer.from(content).toString("base64") : content;
      options.method = method;
      break;
    case "del":
      options.method = "DELETE";
      break;
    default:
      options.method = "GET";
  }

  data = JSON.stringify(data);

  options.headers[auth_header] = token;
  options.headers["user-agent"] = owner;
  options.path = git_type==="GITHUB" ? `/repos/${owner}/${project}/contents/${file}` : `/api/v4/projects/${project}/repository/files/${encodeURIComponent(file)}`;
  options.headers["content-length"] = data.length;
  return await request(options, data);  
}


exports.request = request;
exports.git = git;

