var http = require('http');
var fs = require('fs');
var ip = require('ip');
 
var Myip = ip.address();

var ServerVersion = '0.66b Stable';
var ServerName    = 'Medusa';
var ServerCreator = 'Alexis Gougaut'

var Clients = [];

// Chargement du fichier index.html affiché au client
var server = http.createServer(function(req, res) {
    fs.readFile('./index.html', 'utf-8', function(error, content) {
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(content);
    });
});

// Chargement de socket.io
var io = require('socket.io').listen(server);

    console.log('----------------------------------');
    console.log(ServerName + ' ' + ServerVersion);
    console.log('Server created by ' + ServerCreator);
    console.log('Your ip is : ' + Myip);
    console.log('----------------------------------');

io.sockets.on('connection', function (socket) {
    
    // Permet au client de s'enregistrer.
    socket.on('Register', function(PlayerName, ProceduralGenerationCode){
        
        var sock = socket;
        // On met le joueur dans le tableau, et on le met en recherche
        Clients.push({Name:PlayerName + '_' + socket.id, isPlaying: false, isSearching:true, PlayerSocket:sock});
        // On dit au client que il s'est connecter avec succès
        socket.emit('OnRegister', 'Sucsess !');
        console.log('Client ' + PlayerName + ' as register on server !');
        console.log('Client ' + PlayerName + ' search a party on server...');
        
        // La position du client dans le tableau
        var ClientId;
        // On va chercher la position du client dans le tableau
        for(i = 0; i < Clients.length; i++){
            if(Clients[i]['Name'] == PlayerName + '_' + socket.id){
                ClientId = i;
            }
        }
        
        // Si le client n'est pas dans le tableau on retourne une erreure sur la console
        if(ClientId == null){
            console.log('Erreur le client n\'est pas dans le tableau... Veuillez vous ré-enregistrer !');
            return;
        }
        
        // On regarde dans la listes des client si il y en a un qui attend
        for(i = 0; i < Clients.length; i++){
            // Si on trouve un client qui n'a pas le même nom que nous et qui et en recherche...
            if(Clients[i]['Name'] != PlayerName + '_' + socket.id && Clients[i]['isSearching'] == true){
                // On met l'etat de recherche du recever en false
                Clients[ClientId]['isSearching']        = false;
                // On met l'etat de recherche de l'envoyer en false
                Clients[i]['isSearching']               = false;
                // On nous envoie le nom du recever a l'envoyeur...
                socket.emit('OnPlayerFinded', Clients[i]['Name']);
                // On indique au receveur que il a trouver un amis, on lui donne son nom (le nom de l'envoyeur)
                Clients[i]['PlayerSocket'].emit('OnPlayerFinded', Clients[ClientId]['Name'], ProceduralGenerationCode);
                // On affiche dans la console que l'envoyeur a trouver une partie
                console.log('Client ' + PlayerName + ' find a party on server !');
                // Tout et ok on retourne
                return;
            }
        }
        // On affiche sa dans la console pour savoir si le joueur a trouver une partie ou pas
        console.log('Client ' + PlayerName + ' as not find a party on server... Wait for another player...');
        socket.emit('OnPlayerNotFinded');
    });
    
    // Dit au serveur d'envoyer constament les positions des deux joueur entre eux.
    socket.on('SendMyPosition', function(PlayerNameToSend, PlayerPosition){
        // On cherche dans la liste des clients si il y a un joueur qui correspond au nom de la variable PlayerNameToSend
        for(i = 0; i < Clients.length; i++){
            // Si un client correspond au nom...
            if(Clients[i]['Name'] == PlayerNameToSend){
                // On lui envoie notre position
                Clients[i]['PlayerSocket'].emit('RecevedPositionFriends', PlayerPosition);
                socket.emit('RecevedPositionOfMe', PlayerPosition);
            }
        }
    });
    
    // Dit au serveur de dire a un joueur que il doit se déconnecter
    socket.on('Deconnexion', function(PlayerNameToDisconnect){
        // On cherche dans la liste des clients si le nom d'un client correspond a PlayerNameToDisconnect
       for(i = 0; i < Clients.length; i++){
           // Si le nom correspond bien...
           if(Clients[i]['Name'] == PlayerNameToDisconnect){
               // On lui envoie un message pour lui dire de se déconnecter !
               Clients[i]['PlayerSocket'].emit('Deconnexion');
               console.log(Clients[i]['Name'] + 'was disconnect...');
               Clients.splice(i, 1);
           }
       }
    });
    
    socket.on('OnFriendDead', function(NameOfFriend){
         // On cherche dans la liste des clients si le nom d'un client correspond a NameOfFriend
       for(i = 0; i < Clients.length; i++){
           if(Clients[i]['Name'] == NameOfFriend){
               Clients[i]['PlayerSocket'].emit('OnFriendDead');
           }
       }
    });
    
    socket.on('SendEventTo', function(NameOfFriend, EventName, Args){
        for(i = 0; i < Clients.length; i++){
           if(Clients[i]['Name'] == NameOfFriend){
               Clients[i]['PlayerSocket'].emit('RecevedEvent', EventName, Args);
               socket.emit('RecevedEvent', EventName, Args);
           }
        }
    });
    
});
// On écoute sur le port 8080 (par défault, a changer plus tard....)
server.listen(8080);