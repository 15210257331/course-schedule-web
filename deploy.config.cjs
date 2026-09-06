module.exports = {
    "name": "course-schedule-web",
    "type": "web",
    "deployMode": "docker",
    "port": 8888,
    "buildCommand": "npm run build",
    "assetDir": "dist",
    "remoteDirectory": "/root/web",
    "useBuiltInTemplates": true,
    "ssh": {
        "host": "140.143.168.25",
        "port": 22,
        "username": "",
        "password": ""
    },
    "proxy": {
        "target": "/api",
        "proxy_pass": "http://140.143.168.25:9999"
    },
    "healthCheck": {
        "enabled": true,
        "retries": 12,
        "interval": 5000,
        "path": "/"
    }
}
