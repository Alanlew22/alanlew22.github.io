/* Browser translation of new version/puzzlegame_with_extras1.py. */
(() => {
  'use strict';
  const N = 4, W = 600, MENU = 120, BOARD = 480, CELL = 120, MAX_ROCKS = 3;
  const COLORS = ['#EE4035', '#7BC043', '#050505', '#0492CF'];
  const ROOT = 'images/';
  const PIECES = ['piece_sprite_red.png', 'piece_sprite_green.png', 'piece_sprite_black.png', 'piece_sprite_blue.png'];
  const BUTTONS = [['undo.png',[4,0],'undo'],['reset.png',[4,1],'reset'],['save.png',[4,2],'save'],['load.png',[4,3],'load'],['new_easy.png',[0,-1],'easy'],['new_medium.png',[1,-1],'medium'],['new_hard.png',[2,-1],'hard'],['new_harder.png',[3,-1],'harder'],['new_insane.png',[4,-1],'insane']];
  const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d'), picker = document.querySelector('#load-file'), winMessage = document.querySelector('#win-message'), solutionMessage = document.querySelector('#solution');
  const images = {}; let logic, busy = false, solutionVisible = false, helpVisible = false;
  const eq = (a,b) => a[0] === b[0] && a[1] === b[1];
  const add = (a,b) => [a[0]+b[0],a[1]+b[1]];
  const nearby = (a,b) => (a[0] === b[0] && Math.abs(a[1]-b[1]) === 1) || (a[1] === b[1] && Math.abs(a[0]-b[0]) === 1);
  const turn = d => d[0] === 1 ? [0,-1] : d[1] === -1 ? [-1,0] : d[0] === -1 ? [0,1] : [1,0];
  const copyBoard = b => b.map(([p,d]) => [[...p],[...d]]);
  const randomInt = max => Math.floor(Math.random() * max);
  function preload() { return Promise.all([...PIECES, 'rock_sprite.png', ...BUTTONS.map(b=>b[0])].map(file => new Promise((ok,bad) => { const image = new Image(); image.onload = ok; image.onerror = bad; image.src = ROOT+file; images[file] = image; }))); }

  class Logic {
    constructor(n, targets, board, solution, rocks) { this.n=n; this.targets=targets.map(p=>[...p]); this.boardHistory=[copyBoard(board)]; this.solution=[...solution]; this.rocks=rocks.map(p=>[...p]); this.flipHistory=[[]]; this.movedHistory=[-1]; }
    board() { return this.boardHistory.at(-1); } flips() { return this.flipHistory.at(-1); } moved() { return this.movedHistory.at(-1); }
    move(piece) {
      const board = copyBoard(this.board()), [position,direction] = board[piece], target = add(position,direction);
      if (target[0]<0 || target[0]>=this.n || target[1]<0 || target[1]>=this.n || this.rocks.some(r=>eq(r,target))) return false;
      board[piece] = [target,direction]; const flips=[];
      for (let i=0;i<this.n;i++) if (i !== piece) { const [other,otherDir]=board[i]; if (eq(other,target)) return false; if (nearby(target,other)) { flips.push(i); board[i]=[other,turn(otherDir)]; } }
      this.boardHistory.push(board); this.flipHistory.push(flips); this.movedHistory.push(piece); return true;
    }
    undo() { if (this.boardHistory.length === 1) return false; this.boardHistory.pop(); this.flipHistory.pop(); this.movedHistory.pop(); return true; }
    reset() { this.boardHistory=[this.boardHistory[0]]; this.flipHistory=[[]]; this.movedHistory=[-1]; }
    won() { return this.board().every(([p],i)=>eq(p,this.targets[i])); }
    saveData() { return {format:'puzzle-walls-browser-v1',n:this.n,target:this.targets,board:this.boardHistory[0],solution:this.solution,rocks:this.rocks}; }
  }

  // Matches the source generator's inverse internal direction representation.
  class MakerPiece {
    constructor(index, position, direction) { this.index=index; this.x=position[0]; this.y=position[1]; this.d=direction; }
    canMove(size, occupied) { let x=this.x,y=this.y; if(this.d===0){if(x===0)return false;x--;} if(this.d===1){if(y===0)return false;y--;} if(this.d===2){if(x===size-1)return false;x++;} if(this.d===3){if(y===size-1)return false;y++;} return !occupied.some(p=>p[0]===x&&p[1]===y); }
    move() { if(this.d===0)this.x--; if(this.d===1)this.y--; if(this.d===2)this.x++; if(this.d===3)this.y++; }
    rotate() { this.d=(this.d+1)%4; } guiDirection() { return [[1,0],[0,1],[-1,0],[0,-1]][this.d]; }
  }
  function distinctPositions(count, forbidden=[]) { const result=[]; while(result.length<count) { const candidate=[randomInt(N),randomInt(N)]; if(![...forbidden,...result].some(p=>eq(p,candidate))) result.push(candidate); } return result; }
  function generateOnce(rockCount) {
    const starts=distinctPositions(N), rocks=distinctPositions(rockCount,starts), pieces=starts.map((p,i)=>new MakerPiece(i,p,randomInt(4))), history=[];
    while(history.length < 100) { const occupied=[...pieces.map(p=>[p.x,p.y]),...rocks], legal=pieces.filter(p=>p.canMove(N,occupied)); if(!legal.length) break; const moving=legal[randomInt(legal.length)]; for(const p of pieces) if(Math.abs(p.x-moving.x)+Math.abs(p.y-moving.y)===1) p.rotate(); moving.move(); history.push(moving.index); }
    return {n:N,target:starts,board:pieces.map(p=>[[p.x,p.y],p.guiDirection()]),solution:history.reverse(),rocks};
  }
  function randomPuzzle(range, tries=50000) { let value; for(let i=0;i<tries;i++){value=generateOnce(randomInt(MAX_ROCKS+1)); if(range.includes(value.solution.length))return value;} return value; }
  function hardest(tries=5000) { let best=generateOnce(randomInt(MAX_ROCKS+1)); for(let i=1;i<tries;i++){const candidate=generateOnce(randomInt(MAX_ROCKS+1));if(candidate.solution.length>best.solution.length)best=candidate;}return best; }
  function makeNew(kind) { busy=true; draw('Creating puzzle…'); requestAnimationFrame(()=>{let value; if(kind==='easy')value=randomPuzzle([9,10,11,12]);if(kind==='medium')value=randomPuzzle([13,14,15]);if(kind==='hard')value=randomPuzzle([16,17,18,19]);if(kind==='harder')value=randomPuzzle([20,21,22,23,24]);if(kind==='insane')value=hardest();logic=new Logic(value.n,value.target,value.board,value.solution,value.rocks);solutionVisible=false;busy=false;draw();}); }

  const angle = d => d[0]===1 ? 0 : d[1]===-1 ? -Math.PI/2 : d[0]===-1 ? Math.PI : Math.PI/2;
  function sprite(image,x,y,rotation=0) { ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.drawImage(image,-50,-50);ctx.restore(); }
  function draw(status='',animation=null) {
    ctx.clearRect(0,0,W,W);ctx.fillStyle='#eee8c8';ctx.fillRect(0,0,W,W);ctx.strokeStyle='#7a1d70';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,MENU-1);ctx.lineTo(W,MENU-1);ctx.moveTo(BOARD+1,0);ctx.lineTo(BOARD+1,W);ctx.stroke();ctx.strokeStyle='#333';ctx.lineWidth=1;
    for(let i=1;i<N;i++){ctx.beginPath();ctx.moveTo(0,MENU+i*CELL);ctx.lineTo(BOARD,MENU+i*CELL);ctx.moveTo(i*CELL,MENU);ctx.lineTo(i*CELL,W);ctx.stroke();}
    logic.targets.forEach(([x,y],i)=>{ctx.fillStyle=COLORS[i];ctx.fillRect(x*CELL,MENU+y*CELL,CELL,CELL);});
    BUTTONS.forEach(([file,[x,y]])=>sprite(images[file],x*CELL+60,MENU+y*CELL+60)); logic.rocks.forEach(([x,y])=>sprite(images['rock_sprite.png'],x*CELL+60,MENU+y*CELL+60));
    const shown=animation?.phase==='move'?animation.before:logic.board(); shown.forEach(([p,d],i)=>{let x=p[0],y=p[1],a=angle(d);if(animation?.phase==='move'&&i===animation.moved){const from=animation.before[i][0],to=animation.after[i][0];x=from[0]+(to[0]-from[0])*animation.progress;y=from[1]+(to[1]-from[1])*animation.progress;}if(animation?.phase==='rotate'&&animation.flips.includes(i)){const start=animation.before[i][1],end=animation.after[i][1];a=angle(start)+(eq(end,turn(start))?-Math.PI/2:Math.PI/2)*animation.progress;}sprite(images[PIECES[i]],x*CELL+60,MENU+y*CELL+60,a);});
    winMessage.textContent=logic.won()&&!animation?'YOU WON!':''; renderSolution();
    drawShortcutButton(420, 578, 'S'); drawShortcutButton(452, 578, 'H');
    if(status){ctx.fillStyle='rgba(255,255,255,.82)';ctx.fillRect(145,270,310,60);ctx.fillStyle='#7a1d70';ctx.textAlign='center';ctx.font='bold 20px system-ui';ctx.fillText(status,300,307);}
    if(helpVisible) drawHelp();
  }
  function renderSolution() { solutionMessage.replaceChildren(); if(!solutionVisible)return; logic.solution.forEach(piece=>{const star=document.createElement('span');star.className='solution-star';star.style.color=COLORS[piece];star.textContent='*';solutionMessage.append(star);}); }
  function drawShortcutButton(x, y, label) { ctx.fillStyle='#f8e4f4';ctx.strokeStyle='#7a1d70';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x,y,26,18,5);ctx.fill();ctx.stroke();ctx.fillStyle='#4d1249';ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x+13,y+9);ctx.textBaseline='alphabetic'; }
  function drawHelp() { ctx.fillStyle='rgba(31,15,29,.62)';ctx.fillRect(0,0,W,W);ctx.fillStyle='#fffbed';ctx.strokeStyle='#7a1d70';ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(38,142,524,316,14);ctx.fill();ctx.stroke();ctx.fillStyle='#4d1249';ctx.textAlign='center';ctx.font='bold 29px serif';ctx.fillText('Turn turn turn!',300,188);ctx.font='16px system-ui';const lines=['Move a piece one square in the direction it points by touching it.','You cannot leave the board or move onto an occupied space.','After a move, every piece orthogonally adjacent to the moved piece','turns 90° in counterclockwise direction.','Get each piece onto its matching colored square to win.','Use Undo to reverse a move, Reset to start over,', 'and S to see the solution.','Press H or tap the H button again to close this help.'];lines.forEach((line,i)=>ctx.fillText(line,300,225+i*31)); }
  function animate(before,after,moved,flips) { busy=true; const phase=(name,duration,next)=>{const began=performance.now(),frame=now=>{const progress=Math.min(1,(now-began)/duration);draw('',{phase:name,progress,before,after,moved,flips});progress<1?requestAnimationFrame(frame):next();};requestAnimationFrame(frame);};phase('move',320,()=>phase('rotate',260,()=>{busy=false;draw();})); }
  function hit(x,y) { const gx=Math.floor(x/CELL),gy=Math.floor((y-MENU)/CELL),cx=gx*CELL+60,cy=MENU+gy*CELL+60;return (x-cx)**2+(y-cy)**2<=2500?[gx,gy]:null; }
  function toggleHelp() { helpVisible=!helpVisible;draw(); }
  function handle(x,y) { if(x>=420&&x<=446&&y>=578&&y<=596){if(!busy){solutionVisible=!solutionVisible;draw();}return;}if(x>=452&&x<=478&&y>=578&&y<=596){toggleHelp();return;}if(helpVisible||busy)return;const cell=hit(x,y);if(!cell)return;const board=logic.board(),piece=board.findIndex(([p])=>eq(p,cell));if(piece>=0){const before=copyBoard(board);if(logic.move(piece)){animate(before,copyBoard(logic.board()),piece,logic.flips());return;}}const button=BUTTONS.find(([,p])=>eq(p,cell));if(!button)return;const action=button[2];if(action==='undo'){const before=copyBoard(logic.board()),moved=logic.moved(),flips=[...logic.flips()];if(logic.undo()){animate(before,copyBoard(logic.board()),moved,flips);return;}}else if(action==='reset')logic.reset();else if(action==='save')save();else if(action==='load')picker.click();else makeNew(action);draw(); }
  function point(e){const r=canvas.getBoundingClientRect();return[(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*W/r.height];}
  function save(){const blob=new Blob([JSON.stringify(logic.saveData(),null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='puzzle-walls.puzzle';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  picker.addEventListener('change',async()=>{const file=picker.files[0];picker.value='';if(!file)return;try{const data=JSON.parse(await file.text());if(!Number.isInteger(data.n)||!Array.isArray(data.target)||!Array.isArray(data.board)||!Array.isArray(data.solution)||!Array.isArray(data.rocks))throw Error();logic=new Logic(data.n,data.target,data.board,data.solution,data.rocks);solutionVisible=false;draw();}catch{alert('This is not a valid Walls edition browser save file.');}});
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.focus();handle(...point(e));});window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='h'){toggleHelp();}else if(e.key.toLowerCase()==='s'&&!busy){solutionVisible=!solutionVisible;draw();}});
  preload().then(()=>{const value=randomPuzzle([11,12,13],10000);logic=new Logic(value.n,value.target,value.board,value.solution,value.rocks);draw();}).catch(()=>{document.body.textContent='Unable to load game images.';});
})();
