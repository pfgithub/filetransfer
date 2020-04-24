# filetransfer

quickly transfer files within your local network

## screenshots

### homepage
![homepage](https://raw.githubusercontent.com/pfgithub/filetransfer/master/.github/home.png)

### drop anywhere
![dropanywhere](https://raw.githubusercontent.com/pfgithub/filetransfer/master/.github/dropanywhere.png)

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

if your computer has multiple ip addresses on the local network, start the server with `env IPADDR=[desired]` or `env IFACE=[desired]`. Running the server without either of these will show the possible ip addresses or network interfaces. to disable the baseurl thing entirely, or if other computers have a custom host entry, launch with `env RAWIP=localhost` (switch localhost for the host entry you want).

## notes

- don't run this on a forwarded port, keep it inside your local network.
- qr codes are generated using a google api, so they won't work when you are not connected to the internet.
- there is probably a filesize limit. the default has not been adjusted, so there may be issues with large files. this should be easy to fix.