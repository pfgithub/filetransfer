# filetransfer

quickly transfer files within your local network

## screenshots

### homepage
![homepage](https://raw.githubusercontent.com/pfgithub/filetransfer/master/.github/home.png)

### after uploading files
![uploaded](https://raw.githubusercontent.com/pfgithub/filetransfer/master/.github/uploaded.png)

### download page when multiple files were uploaded
![filelist](https://raw.githubusercontent.com/pfgithub/filetransfer/master/.github/filelist.png)

## usage

install (`yarn install` or `npm install`)

run (`yarn start` or `npm run start`)

the server should start and give a url

## configuration

to select a different port, run with `env PORT=8080`

if your computer has multiple ip addresses on the local network, start the server with `env IPADDR=[desired]` or `env IFACE=[desired]`. Running the server without either of these will show the possible ip addresses or network interfaces.