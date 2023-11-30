interface OnclickHandler{
	(x:number, y:number): void ;
}

interface UpdateHandler{
	(): void;
}

interface HttpPostCallback {
	(x:any): any;
}

const random_id = (len:number) => {
    let p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return [...Array(len)].reduce(a => a + p[Math.floor(Math.random() * p.length)], '');
}

const sleep = async (ms:number) => {
	return new Promise(resolve => setTimeout(resolve, ms));
}

const g_origin = new URL(window.location.href).origin;
const g_id = random_id(12);

const fetchPost = async (page_name:string, payload:any): Promise<any>  => {
    try {
        const response = await fetch(`${g_origin}/${page_name}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error: ', error);
        return null;
    }
};

class Sprite 
{
	x: number;
	y: number;
	speed: number;
	dest_x: number;
	dest_y: number;
	image: HTMLImageElement;
	onclick:OnclickHandler;
	update:UpdateHandler;

	
	constructor(x:number, y:number, image_url:string, update_method:UpdateHandler, onclick_method:OnclickHandler) {
		this.x = x;
		this.y = y;
        this.speed = 4;
		this.image = new Image();
        this.image.src = image_url;
		this.update = update_method;
		this.onclick = onclick_method;
		this.dest_x = this.x;
		this.dest_y = this.y;
	}

	set_destination(x:number, y:number){
		this.dest_x = x;
		this.dest_y = y;
	}	

	ignore_click(x:number, y:number){
	}	

	move(dx:number, dy:number) {
		this.dest_x = this.x + dx;
		this.dest_y = this.y + dy;
	}

	go_toward_destination(){
		if(this.dest_x === undefined)
			return;
		if(this.x < this.dest_x)
			this.x += Math.min(this.dest_x - this.x, this.speed);
		else if(this.x > this.dest_x)
			this.x -= Math.min(this.x - this.dest_x, this.speed);
		if(this.y < this.dest_y)
			this.y += Math.min(this.dest_y - this.y, this.speed);
		else if(this.y > this.dest_y)
			this.y -= Math.min(this.y - this.dest_y, this.speed);
	}	
	sit_still(){
	}
}

let id_to_sprites: Record<string, Sprite> = {};

class Model {
    sprites: Sprite[];
    robot: Sprite;
    bombs: Sprite[];

    constructor() {
        this.sprites = [];
        this.robot = new Sprite(80, 150, "blue_robot.png", Sprite.prototype.go_toward_destination, Sprite.prototype.set_destination);
        this.sprites.push(this.robot);
        this.bombs = [];
    }

    update() {
        for (const sprite of this.sprites) {
            sprite.update();
        }
    }

    onclick(x: number, y: number) {
        for (const sprite of this.sprites) {
            sprite.onclick(x, y);
        }
    }

    move(dx: number, dy: number) {
        this.robot.move(dx, dy);
    }

    async explodeBomb(bomb: Sprite): Promise<void> {
		console.log("exploding bomb")
        const explosionDelay = 3000;
        const removeDelay = 3300;

        const bombImage = new Image(); 
        bombImage.src = "bomb.png";

        const explosionImage = new Image(); 
        explosionImage.src = "explosion.png";

        this.sprites.push(bomb);

        await sleep(explosionDelay);

		bomb.image = explosionImage;

        await sleep(removeDelay);
        const index = this.sprites.indexOf(bomb);
        if (index !== -1) {
            this.sprites.splice(index, 1); 
        }
    }
}

class View
{
	model:Model;
	canvas:HTMLCanvasElement;
	
	constructor(model:Model) {
		this.model = model;
		this.canvas = document.getElementById("myCanvas") as unknown as HTMLCanvasElement;
	}

	update() {
		let ctx = this.canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
		ctx.clearRect(0, 0, 1000, 500);
		for (const sprite of this.model.sprites) {
			ctx.drawImage(sprite.image, sprite.x - sprite.image.width / 2, sprite.y - sprite.image.height);
		}
	}
}

class Controller {
    key_right: boolean;
    key_left: boolean;
    key_up: boolean;
    key_down: boolean;
    model: Model;
    view: View;
    last_updates_request_time: number;
    isSpacePressed: boolean;

    constructor(model: Model, view: View) {
        this.model = model;
        this.view = view;
        this.key_right = false;
        this.key_left = false;
        this.key_up = false;
        this.key_down = false;
        this.isSpacePressed = false;

        let self = this;
        this.last_updates_request_time = 0;
        view.canvas.addEventListener("click", function(event) { self.onClick(event); });
        document.addEventListener('keydown', function(event) { self.keyDown(event); }, false);
        document.addEventListener('keyup', function(event) { self.keyUp(event); }, false);
    }

    async onClick(event: MouseEvent) {
        const x = event.pageX - this.view.canvas.offsetLeft;
        const y = event.pageY - this.view.canvas.offsetTop;
        this.model.onclick(x, y);
    
        fetchPost('ajax.html', {
            id: g_id,
            action: 'Click',
            x,
            y,
        })
        .then(response => {
            if (response) {
                console.log(`Response to click: ${JSON.stringify(response)}`);
            } else {
                console.error('Invalid response');
            }
        })
        .catch(error => {
            console.error(error);
        });
    }

    keyDown(event: KeyboardEvent) {
        if (event.keyCode == 39) this.key_right = true;
        else if (event.keyCode == 37) this.key_left = true;
        else if (event.keyCode == 38) this.key_up = true;
        else if (event.keyCode == 40) this.key_down = true;
        else if (event.keyCode == 32) this.model.explodeBomb(new Sprite(this.model.robot.x, this.model.robot.y, "bomb.png", Sprite.prototype.go_toward_destination, Sprite.prototype.set_destination)); 
    }

    keyUp(event: KeyboardEvent) {
        if (event.keyCode == 39) this.key_right = false;
        else if (event.keyCode == 37) this.key_left = false;
        else if (event.keyCode == 38) this.key_up = false;
        else if (event.keyCode == 40) this.key_down = false;
        else if (event.keyCode == 32) this.isSpacePressed = false; 
    }

	on_receive_updates(ob: any) {
		console.log(`ob: ${JSON.stringify(ob)}`);
		if(ob === null || ob === undefined || ob.updates === undefined) {   
			return;
		}

		for (let i = 0; i < ob.updates.length; i++) {
			let up = ob.updates[i];
			let id = up[0];
			let x = up[1];
			let y = up[2];
			let sprite = id_to_sprites[id];
			
			console.log(this.model.sprites);
			console.log(id_to_sprites);

            if (sprite === undefined && id !== g_id) {
				sprite = new Sprite(80, 150, "green_robot.png", Sprite.prototype.go_toward_destination, Sprite.prototype.ignore_click)
				this.model.sprites.push(sprite);
				id_to_sprites[id] = sprite;
			}
            if (sprite !== undefined) {
                sprite.set_destination(x, y);
            }
		}
	}

    dropBomb() {
		console.log("pressed space")
        if (!this.isSpacePressed) {
            this.isSpacePressed = true;
            const interval = setInterval(() => {
                if (this.isSpacePressed) {
					console.log("adding bomb")
                    const bomb = new Sprite(this.model.robot.x, this.model.robot.y, "bomb.png", Sprite.prototype.go_toward_destination, Sprite.prototype.set_destination);
                    this.model.sprites.push(bomb);
                    this.model.bombs.push(bomb);
                    this.model.explodeBomb(bomb);
                } else {
                    clearInterval(interval);
                }
            }, 3000); 
        }
    }

	async request_updates() {
        try {
            const ob = await fetchPost('ajax.html', {
                id: g_id,
                action: 'Update',
            });

        if (ob) {
            console.log(`Received update: ${JSON.stringify(ob)}`);
            this.on_receive_updates(ob);
        } else {
            console.error('Invalid update response');
        }
        } catch (error) {
            console.error(error);
        }    
    }

    update() {
        let dx = 0;
        let dy = 0;
        let speed = this.model.robot.speed;
        if (this.key_right) dx += speed;
        if (this.key_left) dx -= speed;
        if (this.key_up) dy -= speed;
        if (this.key_down) dy += speed;
        if (dx != 0 || dy != 0)
            this.model.move(dx, dy);

        const time = Date.now();
        if (time - this.last_updates_request_time >= 1000) {
			this.last_updates_request_time = time;
			this.request_updates();
		}
	}

	onAcknowledgeClick(ob: any) {
		console.log(`Response to move: ${JSON.stringify(ob)}`);
	}
}

class Game {
	model:Model;
	view:View;
	controller:Controller;
	constructor() {
		this.model = new Model();
		this.view = new View(this.model);
		this.controller = new Controller(this.model, this.view);
	}

	onTimer() {
		this.controller.update();
		this.model.update();
		this.view.update();
	}
}

let game = new Game();
let timer = setInterval(() => { game.onTimer(); }, 40);