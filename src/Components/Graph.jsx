import React, {Component} from 'react';
import * as d3 from 'd3'
import DatGui, {DatNumber, DatBoolean} from 'react-dat-gui'
import axios from 'axios'
import {varia} from "../functions/varia";
import $ from 'jquery'

import '../statics/style/graph.css'


/*
* Graph组件用来render deltamap
* 其中格式化函数是guans-deltamap函数中的varia()函数进行格式化的
* 画图函数是重新在draw_graph()函数中编写的，因为省去了很多不用的功能
*
* 更改：
*   内外圆半径: 全局搜索R, r
*   双圆坐标：x0，y0
* */


class Graph extends Component {
    constructor(props){
        super(props);
        this.state = {
            GUI_default: {
                power: 200,
                isAwesome: true,
                innerRadius: 175,
                strokeWidth: 5,
                // this.colorAsc = [16, 128, 35, 0.932]
                colorAsc: [25, 99, 168, 1],
                colorDesc: [168, 39, 16, 0.932],
            },

            width: 500,
            height: 500,

            initData: [],
            viewData: {},

            filter_number: 0
        }


        this.load_data = this.load_data.bind(this)
        this.draw_graph = this.draw_graph.bind(this)
        this.handle_GUI_update = this.handle_GUI_update.bind(this)
        this.draw_graph$_draw_semi = this.draw_graph$_draw_semi.bind(this)
        // this.draw_graph$_draw_semi$_handle_radius = this.draw_graph$_draw_semi$_handle_radius.bind(this)

    }

    load_data(){
        let shuffleFrom = d3.shuffle(d3.range(75, 150))
        let shuffleTo = d3.shuffle(d3.range(75, 150))

        let dataOrigin = {}
        dataOrigin.axisnode = d3.range(151);

        dataOrigin.link = d3.range(50).map((d, i)=>{
            return {
                name: Math.random().toString(36).slice(-6),
                start: shuffleFrom[i],
                end: shuffleTo[i]
            }
        })

        return dataOrigin
    }


    //画一个svg画布中的半圆, 参数trend可以是rise或者是drop，分别代表了右半圆和左半圆
    draw_graph$_draw_semi(svg, _data, trend){
        if(!svg){
            throw 'ValueError: "svg" attribute not defined'
            return
        }

        if(!_data){
            throw('ValueError: "data" attribute not defined')
            return
        }

        if(trend!=='rise' && trend!=='drop'){
            throw('ValueError: "trend" attribute not "rise" or "drop"')
            return
        }

        const width = this.state.width, height = this.state.height

        // let svg = svg_g.append('g')
        //     .attr('transform', `translate(${width/2},${height/2})`)

        /*获取数据*/
        let data = {}
        if(trend === 'rise'){
            data = _data.rise
        }else if(trend === 'drop'){
            data = _data.drop
        }


        /*定义圆心坐标*/
        let x0 = $('#graph').width()/2
        let y0 = $('#graph').height()/2
        let cxy = []
        if(x0 && y0){
            cxy = [x0, y0]
        }else{
            throw 'circle center (x0,y0) not exists'
        }


        let link = data.link.sort((a,b)=>{
            return b.delta-a.delta;
        })

        let thresh = link[10]/*TODO: 处理筛选item个数*/
        let alpha;

        /*计算内外圆的半径*/
        let ang1, ang2
        data.axisnode.forEach(d=>{
            if(d.uid === thresh.fromId){
                ang1 = d.angle
            }
            if(d.uid === thresh.toId){
                ang2 = d.angle
            }
        })

        alpha = ang1 - ang2

        /*定义外圆和内圆的半径*/
        let R = 0.8 * y0
        let r = R * Math.cos(alpha>Math.PI/2?Math.PI/2:alpha)
        let R_r = [R, r]

        /*这个函数下面画图要用到*/
        let getExtentFromOutput = (data)=>{
            let [min,max] = d3.extent(data.link.reduce((prev,cur)=>{
                prev.push(cur.from, cur.to)
                return prev
            },[]))

            return [min, max];
        };


        /*画svg*/
        let [outerRadius, innerRadius] = R_r
        let [cx, cy] = cxy

        let max = getExtentFromOutput(data)[1], min = getExtentFromOutput(data)[0]

        svg.selectAll("*")
            .remove()

        /* 创建包含dm的g，并且移动到指定位置 */
        svg = svg.append('g')
            .attr('transform', `translate(${cx},${cy})`)

        //定义环形的映射比例尺
        let scale = d3.scaleLinear()
            .domain([min, max])
            .range([trend==='rise'?Math.PI:-Math.PI, 0])

        //画放射的标识虚线
        let radialLine = d3.radialLine()
            .angle(d=>d.angle)
            .radius(d=>d.radius)

        let strokeDataForPolarAxis = data.axisnode.map((d,i)=>{
            return d.tick%10 == 0 ||d.uid == 0 ||d.uid == data.axisnode.length?
                [
                    {
                        angle: 0,
                        radius: 0
                    },
                    {
                        angle: d.angle,
                        radius: outerRadius
                    }
                ]:[ ];
        })

        svg.append('g')
            .selectAll('.radial-stroke')
            .data(strokeDataForPolarAxis)
            .enter()
            .append('path')
            .attr('class', 'radial-stroke')
            .attr('d', radialLine)


        //画outer环形坐标的圆
        svg.append('g')
            .attr('class', 'axis-outer')
            .append('path')
            .attr('d', d3.arc()
                .innerRadius(outerRadius)
                .outerRadius(outerRadius)
                .startAngle(trend==='rise'?0 : Math.PI)
                .endAngle(trend==='rise'?Math.PI : 2*Math.PI)
            )



        //画inner环形坐标的圆
        let innerCircle = svg.append('g')
            .attr('class', 'axis-inner')
            .append('path')
            .attr('d', d3.arc()
                .innerRadius(innerRadius)
                .outerRadius(innerRadius)
                .startAngle(trend==='rise'?0 : Math.PI)
                .endAngle(trend==='rise'?Math.PI : 2*Math.PI)
            )


        //绘制半圆上inner坐标上的刻度
        let tick_inner = svg.append("g");

        var xTick = tick_inner
            .selectAll("g")
            .data(scale.ticks(20))
            .enter().append("g")
            .attr("text-anchor", "middle")
            .attr("transform", function(d) {
                return "rotate(" + ((scale(d)) * 180 / Math.PI - 90) + ")translate(" + innerRadius + ",0)";
            });

        xTick
            .append("line")
            .attr("x2", (d,i)=>{
                return d%20 == 0 ||d == 0 ||d == 150? 7:4;
            })
            .attr("stroke", "rgb(82, 79, 79)")
            .attr('stroke-width', d=>{
                return d%20 == 0 ||d == 0 ||d == 150? 2:1;
            })


        /*绘制outer坐标上的刻度*/
        let xAxisOuter = svg.append("g");

        let xOuterTick = xAxisOuter
            .selectAll("g")
            .data(scale.ticks(max-min))//算出总tick数
            .enter().append("g")
            .attr("text-anchor", "middle")
            .attr("transform", function(d) {
                return "rotate(" + ((scale(d)) * 180 / Math.PI - 90) + ")translate(" + outerRadius + ",0)";
            });

        xOuterTick.append("line")
            .attr("x2", (d,i)=>{
                return d%20 == 0 ||d == 0 ||d == 150? 7:4;
            })
            .attr("stroke", "rgb(82, 79, 79)")
            .attr('stroke-width', d=>{
                return d%20 == 0 ||d == 0 ||d == 150? 2:1;
            });

        xOuterTick.append("text")
            .attr("transform", function(d) {
                var angle = scale(d);
                return ((angle < Math.PI / 2) || (angle > (Math.PI * 3 / 2))) ? "rotate(90)translate(0,-14)" : "rotate(-90)translate(0, 18)";
            })
            .text(function(d) {
                return d==max||d==min?d:(d%5==0?d:null)
            })
            .style("font-size", 12)
            .style('font-weight', 500)

        /*TODO: 加入交互的div，源代码：Deltamap/libs/vis_examples.js/312:*/

        //绘制axis之间的link
        let dataForRadialLine = data.link.map((d,i)=>{
            return [{
                    uid: d.uid,
                    name: d.name,
                    fromId: d.fromId,
                    toId: d.toId,
                    from: d.from,
                    to: d.to,
                    delta: d.delta,
                    angle:data.axisnode[d.fromId].angle,
                    radius: innerRadius
                },{
                    angle:data.axisnode[d.toId].angle,
                    radius: outerRadius
                }]
        })

        let links = svg.append('g')
            .selectAll('.link')
            .data(dataForRadialLine)
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', radialLine)
            .attr('stroke', 'red')

        //画D区域的link
        let clip = svg.append('defs')
            .append('clipPath')
            .attr('id', 'clip')
            .append('circle')
            .attr('r', innerRadius)

        let links_d = svg.append('g')
            .attr('clip-path', 'url(#clip)')
            .selectAll('.link-d')
            .data(dataForRadialLine)
            .enter()
            .append('path')
            .attr('class', 'link-d')
            .attr('d', radialLine)
            .attr('stroke', 'red')

        //画分割线
        let separation = svg
            .append('line')
            .attr('x1',0)
            .attr('x2',0)
            .attr('y1',-outerRadius)
            .attr('y2',outerRadius)
            .attr('stroke','rgb(82, 79, 79)')
            .attr('stroke-width','1px')
            .attr('stroke-dasharray', '6,3')

        /*明天debug drop部分的图*/


    }





    /*画整个deltamap的graph*/
    draw_graph(){
        const width = this.state.width, height = this.state.height

        //define svg groups
        const svg = d3.select('#graph')
            .attr('width', width)
            .attr('height', height)


        axios.get('data/data.json')
            /*加载数据*/
            .then(d=>{
                return d.data.data //取到data，传给下一个.then()
            })
            /*处理数据，设置state*/
            .then(d=>{
                this.setState({
                    initData:d,
                    viewData: varia(d)
                })
            })
            /*用state中的数据画图*/
            .then(()=>{
                let data = this.state.viewData
                //画rise或者drop的半圆
                this.draw_graph$_draw_semi(svg, data,'rise')

            })




    }

    handle_GUI_update(newData) {

        this.setState(prevState => ({
            GUI_default: { ...prevState.data, ...newData }
    }));
        d3.select('circle').attr('r',this.state.GUI_default.power)


    }



    componentDidMount(){
        this.load_data()
        this.draw_graph()
    }

    render(){
        //设置GUI的默认值
        const GUI_default_data = this.state.GUI_default

        return(
            <div className={'graph_container'}>
                <svg id={'graph'}></svg>

                <DatGui data={GUI_default_data} onUpdate={this.handle_GUI_update}>
                    <DatNumber path='power' label='power' min={0} max={500} step={1}/>
                    <DatBoolean path='isAwesome' label='Awesome?' />
                </DatGui>
            </div>
        )
    }
}

export default Graph;
