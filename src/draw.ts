import * as $ from 'jquery';
import {C} from '@angular/core/src/render3';

const xmlns = "http://www.w3.org/2000/svg";

const CIRCLE_COLOR = 'transparent';
const CIRCLE_COLOR_SELECTED = 'rgba(0,255,0,0.5)';
const CIRCLE_SIZE = 15;

const CIRCLE_STROKE_COLOR = 'black';
const CIRCLE_STROKE_WIDTH = '3';


const CONNECTOR_COLOR = 'black';//'#5d4037'
const CONNECTOR_WIDTH = 4;

const CONTROLLER_COLOR = 'red';

const GRID_SIZE = 20; //TODO


export enum SVG_EVENTS {
  NULL = 0,
  SELECT = 1,
  ADD = 2,
  CONNECT = 3
}

export class SVG {

  // ============
  // Design
  // ============
  public gridVisible = true;

  public field: HTMLElement;
  public svg: Element;

  public connectorGroup: Element; //render first
  public circleGroup: Element;

  public circles: Array<Circle> = [];


  public curved = false;


  public circles_id = 0;


  public selected_element: SVGElement; //TODO
  public drag_element: Dragable; //TODO


  public mode: SVG_EVENTS;
  private snap_to_grid = false;

  constructor(id: string) {
    this.field =  document.getElementById(id);

    var boxWidth = 300;
    var boxHeight = 300;


    this.svg = document.createElementNS(xmlns, 'svg');


    this.svg.setAttributeNS(null, 'width', '100%');
    this.svg.setAttributeNS(null, 'height', '100%');
    this.svg.setAttributeNS( null, 'id', 'svg_canvas'); //TODO

    if (this.gridVisible) {
      this.svg.setAttributeNS( null, 'style', 'background: url(http://svgjs.com/svg.draw.js/demo/grid.png) #fff;'); //TODO
    }

    //Group for connectors
    this.connectorGroup = document.createElementNS(xmlns, 'g');
    this.svg.appendChild(this.connectorGroup);

    /*  ===================
    *       Drag and Drop
        =================== */
    //For Drag
    this.svg.addEventListener('mousemove', (event) => {
      if (this.drag_element) {
        //update x ,y

        const mouse_x = event.pageX - $('#svg_canvas').offset().left;// - this.drag_element.r;
        const mouse_y = event.pageY - $('#svg_canvas').offset().top;// + this.drag_element.r;

        const pos_x = this.drag_element.x + (mouse_x - this.drag_element.x);
        const pos_y = this.drag_element.y + (mouse_y - this.drag_element.y);

        if (this.isSnapMode()) {

          console.log(pos_x);
          this.drag_element.x = Math.round(pos_x / GRID_SIZE) * GRID_SIZE - this.drag_element.r;
          console.log(this.drag_element.x);
          if (this.drag_element.x <= 0) {
            this.drag_element.x += 20;
          }

          this.drag_element.y = Math.round(pos_y  / GRID_SIZE) * GRID_SIZE + this.drag_element.r;

          //TODO border
          if (this.drag_element.y >= $('#svg_canvas').width()) {
            this.drag_element.y -= 20;
          }

        } else {

          this.drag_element.setX(pos_x - this.drag_element.r);
          this.drag_element.setY(pos_y + this.drag_element.r);
        }



        this.drag_element.update();
      }
    });

    /**
    this.svg.addEventListener('keypress', (event) => { //TODO not working
      console.log("keyevent");
      if (event.keyCode === 17) {//CTRL
        this.setSnapToGrid(true);
        console.log("KEyevent");
      }
    });**/
    document.addEventListener('keydown', (event) => { //TODO not working
    if (event.keyCode === 17) {//CTRL
      this.setSnapToGrid(true);
    }

    if (event.keyCode === 46) { //Delete / Entf
      this.selected_element.remove();
      this.selected_element = undefined;
    }

  });

    document.addEventListener('keyup', (event) => { //TODO not working
      if (event.keyCode === 17) {//CTRL
        this.setSnapToGrid(false);
      }
    });




    //Add Circle
    this.svg.addEventListener('mousedown', (event) => {
      //add Circle
      if (this.mode === SVG_EVENTS.ADD) {

        const pos_x = event.pageX - $('#svg_canvas').offset().left;// - CIRCLE_SIZE;
        const pos_y = event.pageY - $('#svg_canvas').offset().top;// + CIRCLE_SIZE;

        this.addCircle(new Circle(this, pos_x, pos_y, CIRCLE_SIZE));
      }
    });


    this.field.appendChild(this.svg);
  }

  addCircle(c: Circle) {
    this.circles.push(c);
    c.setId(this.circles_id);
    this.svg.appendChild(c.getGroup());
    this.circles_id++;
  }

  public removeCircle(c: Circle) {
    this.circles = this.circles.filter(obj => obj !== c); //remove from list
    this.svg.removeChild(c.getGroup());
  }

  addConnection(c: Connector) {
    //TODO list?
    this.connectorGroup.appendChild(c.getElement());
  }

  public removeConnection(c: Connector) {
    this.connectorGroup.removeChild(c.getElement());
  }

  select(c: SVGElement) {
    if (this.selected_element) {
      this.selected_element.setColor('default');
    }

    if (this.selected_element instanceof CurvedConnector) {
      this.selected_element.middlePoint.getElement().setAttribute('fill', 'none');
    }

    this.selected_element = c;
    this.selected_element.setColor('selected');

    if (this.selected_element instanceof CurvedConnector) {
      this.selected_element.middlePoint.getElement().setAttribute('fill', CONTROLLER_COLOR);
    }
  }

  setDrag(c: Circle) {
    this.drag_element = c;
  }

  public toggleSnap() {
    this.snap_to_grid = !this.snap_to_grid;
  }

  public  toggleCurved() {
    this.curved = !this.curved;
  }

  public isCurved(): boolean {
    return this.curved;
  }

  public setSnapToGrid(snap: boolean) {
    this.snap_to_grid = snap;
  }

  public isSnapMode(): boolean {
    return this.snap_to_grid;
  }

  public getSVG(): Element {
    return this.svg;
  }


}


export class SVGElement {
  //TODO
  protected element: Element;

  constructor() {

  }
  public setColor(color: string) {
    this.element.setAttribute('fill', color);
  }

  public remove() {
    //TODO
  }

  public getElement(): Element {
    return this.element;
  }
}


export class Circle extends SVGElement implements Dragable {

  public x: number;
  public y: number;
  public r: number;
  public fill: string; //color
  public style: string; //css

  private id: number;

  public dragged = false;

  public group: Element; //TODO private
  //private element: Element;

  public parent: SVG;

  private connections: Array<Connector> = [];

  constructor(svg: SVG, x: number, y: number, r: number) {
    super();
    var xmlns = "http://www.w3.org/2000/svg";

    this.parent = svg;

    this.x = x;
    this.y = y;
    this.r = r;

    this.group = document.createElementNS(xmlns, 'g');

    if (this.parent.isSnapMode()) {

      //mouse

      this.x = Math.round(x / GRID_SIZE) * GRID_SIZE - this.r;
      this.y = Math.round(y  / GRID_SIZE) * GRID_SIZE + this.r;
      this.group.setAttributeNS (null, 'transform', 'matrix(1,0,0,-1,'+this.x+','+this.y+')');
    } else {
      this.x = this.x - CIRCLE_SIZE;
      this.y = this.y + CIRCLE_SIZE;
      this.group.setAttributeNS (null, 'transform', 'matrix(1,0,0,-1,'+this.x+','+this.y+')');
    }



    this.element = document.createElementNS(xmlns, 'circle');
    this.element.setAttribute('r', this.r.toString());
    this.element.setAttribute('cx', this.r.toString());
    this.element.setAttribute('cy', this.r.toString());

    this.element.setAttribute('fill', 'transparent');

    this.element.setAttribute('stroke', CIRCLE_STROKE_COLOR);
    this.element.setAttribute('stroke-width', CIRCLE_STROKE_WIDTH);

    this.parent.addCircle(this);


    //=========================
    // CROSS
    // =======================

    const cross_x = document.createElementNS(xmlns, 'rect');
    cross_x.setAttribute('x', '-10');
    cross_x.setAttribute('y', this.r.toString());

    cross_x.setAttribute('width', '50');
    cross_x.setAttribute('height', '1');

    cross_x.setAttribute('fill', 'none');
    cross_x.setAttribute('stroke', CIRCLE_STROKE_COLOR);
    cross_x.setAttribute('stroke-width', '1');

    this.group.appendChild(cross_x);

    const cross_y = document.createElementNS(xmlns, 'rect');
    cross_y.setAttribute('x', this.r.toString());
    cross_y.setAttribute('y', '-10');

    cross_y.setAttribute('width', '1');
    cross_y.setAttribute('height', '50');

    cross_y.setAttribute('fill', 'none');
    cross_y.setAttribute('stroke', CIRCLE_STROKE_COLOR);
    cross_y.setAttribute('stroke-width', '1');

    this.group.appendChild(cross_y);



    //drag events
    this.group.addEventListener('mousedown', (event) => {

      let connected = false;

      //for connection
      if (this.parent.mode === SVG_EVENTS.CONNECT) {
        if (this.parent.selected_element instanceof Circle) {
          let exist = false;
          for (const con of this.connections) {
            if (con.c1 === this.parent.selected_element || con.c2 === this.parent.selected_element) {
              exist = true;
            }
          }
          if (!exist) {

            if (this.parent.curved) {
              const con = new CurvedConnector(this.parent, this.parent.selected_element, this); //new connector
              this.connections.push(con);
              this.parent.selected_element.connections.push(con);
            } else {
              const con = new Connector(this.parent, this.parent.selected_element, this); //new connector
              this.connections.push(con);
              this.parent.selected_element.connections.push(con);
            }
          }

        connected = true;

        }
      }

      if (!connected) {
        this.dragged = true;
        this.parent.setDrag(this);
        this.parent.select(this);
      } else {
        this.dragged = false;
        this.parent.setDrag(undefined);
        this.parent.select(undefined);
      }


    });



    this.group.addEventListener('mouseup', (event) => {
      this.dragged = false;
      this.parent.setDrag(undefined);
    });



    this.group.appendChild(this.element);
 }

 public setColor(color: string) {

    if (color === 'default') {
      color = CIRCLE_COLOR;
    } else if (color === 'selected') {
      color = CIRCLE_COLOR_SELECTED;
    }
   this.element.setAttribute('fill', color);
 }

  getGroup(): Element {
    return this.group;
  }

  setId(id: number) {
    this.id = id;
    this.element.setAttribute('id', 'Svg_circle_' + this.id);
  }

  getId(): number {
    return this.id;
  }

  update() {

    this.group.setAttributeNS(null, 'transform', 'matrix(1,0,0,-1,' + this.x + ',' + this.y + ')');

    for (const con of this.connections) {
      con.update();
    }
  }


  remove() {
    this.parent.removeCircle(this);
    //remove connectrions
    for (const con of this.connections) {
      this.parent.removeConnection(con);
      con.c1.removeConnection(con);
      con.c2.removeConnection(con);
    }
  }

  removeConnection(con) {
    this.connections = this.connections.filter(obj => obj !== con); //remove from list
  }

  setX(x: number) {
    this.x = x;
  }

  setY(y: number) {
    this.y = y;
  }



}

export class Connector extends SVGElement {

  public c1: Circle;
  public c2: Circle;

 // private element: Element;
  public parent: SVG;

  protected path: string;

  constructor(parent: SVG, c1: Circle, c2: Circle) {
    super();
    this.c1 = c1;
    this.c2 = c2;
    this.parent = parent;

    this.path = this.createPath();
    this.element = document.createElementNS(xmlns, 'path');

    this.element.setAttribute('id', 'path_' + c1.getId() + '_' + c2.getId());
    this.element.setAttribute('d', this.path);
    this.element.setAttribute('stroke', CONNECTOR_COLOR);
    this.element.setAttribute('stroke-width', CONNECTOR_WIDTH.toString());
    this.element.setAttribute('fill', 'none');


    this.parent.addConnection(this);



    //drag events
    this.element.addEventListener('mousedown', (event) => {
      this.parent.select(this);
    });


  }

  public createPath(): string {
    return 'M' + (this.c1.x + this.c1.r) + ' ' + (this.c1.y - this.c1.r) + 'L' + (this.c2.x + this.c2.r) + ' ' + (this.c2.y - this.c2.r);
  }

  public getElement(): Element {
    return this.element;
  }

  update() {
    this.path = this.createPath();
    this.element.setAttribute('d', this.path);
  }

  public setColor(color: string) {
    if (color === 'default') {
      color = CONNECTOR_COLOR;
    } else if (color === 'selected') {
      color = CIRCLE_COLOR_SELECTED;
    }
    this.element.setAttribute('stroke', color);
  }

  remove() {
    this.parent.removeConnection(this);
    this.c1.removeConnection(this);
    this.c2.removeConnection(this);
  }
}

export class CurvedConnector extends Connector {

    public middlePoint: MiddlePoint;

    constructor(parent: SVG, c1: Circle, c2: Circle) {
      super(parent, c1, c2);
      this.middlePoint = new MiddlePoint(this,  this.c2.x - ((this.c2.x - this.c1.x) / 2),  this.c2.y - ((this.c2.y - this.c1.y) / 2));
      this.parent.getSVG().appendChild(this.middlePoint.getGroup());
    }


  public createPath(): string {

    /**
     * Because createPath is called in super Const, before middlepoint is set!
     */
    if (!this.middlePoint) {
        this.middlePoint = new MiddlePoint(this,  this.c2.x - ((this.c2.x - this.c1.x) / 2),  this.c2.y - ((this.c2.y - this.c1.y) / 2));
      }

    const dist_direction = {x: this.c2.x - this.c1.x, y: this.c2.y - this.c1.y };


    const middel_str = (this.middlePoint.x  - this.c1.x ) + ' ' + (this.middlePoint.y  - this.c1.y); //get relatic pos to c1
    return 'M' + (this.c1.x + this.c1.r) + ' ' + (this.c1.y - this.c1.r) + ' q'  + middel_str + ',' + (dist_direction.x) + ' ' + (dist_direction.y);
  }

  update() {
    this.path = this.createPath();
    this.element.setAttribute('d', this.path);
    //this.middlePoint.updateDown();
  }

}


export class MiddlePoint extends SVGElement implements Dragable {

  public x: number;
  public y: number;

  public r: number;

  public dragged = false;

  public group: Element;
  private parent: CurvedConnector;

  constructor(parent: CurvedConnector, x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
    this.parent = parent;
    this.r = 5;

    this.group = document.createElementNS(xmlns, 'g');
    this.group.setAttributeNS(null, 'transform', 'matrix(1,0,0,-1,' + ( x) + ',' + ( y) + ')');


    this.element = document.createElementNS(xmlns, 'circle');
    this.element.setAttribute('r', this.r.toString());
    this.element.setAttribute('x', '0');
    this.element.setAttribute('y', '0');

    this.element.setAttribute('fill', 'none'); //hidden element


    this.group.appendChild(this.element);


    //drag events
    this.group.addEventListener('mousedown', (event) => {

      this.dragged = true;
      this.parent.parent.setDrag(this);


    });



    this.group.addEventListener('mouseup', (event) => {
      this.dragged = false;
      this.parent.parent.setDrag(undefined);
    });



  }

  getGroup(): Element {
    return this.group;
  }

  updateDown() { //why is it not updating?
    this.group.setAttributeNS(null, 'transform', 'matrix(1,0,0,-1,' + (this.parent.c1.x + this.x) + ',' + (this.parent.c1.y + this.y) + ')');
    //this.element.setAttribute('fill', 'blue');
  }

  update() {
    //update parent
    this.group.setAttributeNS(null, 'transform', 'matrix(1,0,0,-1,' + ( this.x) + ',' + (this.y) + ')');
    this.parent.update();
  }

  setX(x: number) {
    this.x =  x + this.r;
  }

  setY(y: number) {
    this.y = y - this.r;
  }

}

export interface Dragable {
  dragged: boolean;
  x: number;
  y: number;
  r: number;

  update();
  setX(x: number);
  setY(y: number);
}