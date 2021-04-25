import React, {Component} from 'react';
import * as d3 from 'd3'
import axios from 'axios'
import {varia} from "../functions/varia";
import $ from 'jquery'




/*
* Graph组件用来render deltamap
* 其中格式化函数是guans-deltamap函数中的varia()函数进行格式化的
* 画图函数是重新在draw_graph()函数中编写的，因为省去了很多不用的功能
*
* 更改：
*   内外圆半径: 全局搜索R, r
*   双圆坐标：x0，y0
* */


/*
* BUG:
*  1) 把有时候输入一个filter_num的bug修复一下（提示：`let thresh = link[10]`就会出现这个bug）
* */


class Deltamap extends Component {
    constructor(props) {
        super(props);
        this.state = {

            width: 500,
            height: 500,

            initData: [],
            viewData: {},

            innerAxis_rise: 100,
            innerAxis_drop: 100,

            /*TODO: 更改初始residue-items的个数以计算inner axis的大小*/
            filter_num_rise: 10,
            filter_num_drop: 10,

            /*下面是一些杂项，为了避免跨组件引用要重新写的麻烦*/
            scale_rise: function () {
            },
            scale_drop: function () {
            },

        }


        this.draw_graph = this.draw_graph.bind(this)
        this.handle_GUI_update = this.handle_GUI_update.bind(this)
        this.draw_graph$_draw_semi = this.draw_graph$_draw_semi.bind(this)
        this.handle_filter_num_rise = this.handle_filter_num_rise.bind(this)
        this.handle_filter_num_drop = this.handle_filter_num_drop.bind(this)
        this.handle_controller_rise = this.handle_controller_rise.bind(this)
        this.handle_controller_drop = this.handle_controller_drop.bind(this)

        /*交互函数*/
        this.draw_graph$_tooltip = this.draw_graph$_tooltip.bind(this)
        this.mouseover = this.mouseover.bind(this)
        this.mouseout = this.mouseout.bind(this)

    }


    //画一个svg画布中的半圆, 参数trend可以是rise或者是drop，分别代表了右半圆和左半圆
    draw_graph$_draw_semi(svg, _data, trend) {

        if (!svg) {
            throw 'ValueError: "svg" attribute not defined'
            return
        }

        if (!_data) {
            throw('ValueError: "data" attribute not defined')
            return
        }

        if (trend !== 'rise' && trend !== 'drop') {
            throw('ValueError: "trend" attribute not "rise" or "drop"')
            return
        }

        const width = this.state.width, height = this.state.height
        let filter_num = trend === 'rise' ? this.state.filter_num_rise : this.state.filter_num_drop


        /*获取数据*/
        let data = {}
        if (trend === 'rise') {
            data = _data.rise
        } else if (trend === 'drop') {
            data = _data.drop
        }

        /*转换data为drop的数据*/
        /*data.axisnode.forEach(d=>{
            d.angle = -d.angle
        })

        trend = 'drop'*/

        /*定义圆心坐标*/
        let x0 = $('#graph').width() / 2
        let y0 = $('#graph').height() / 2
        let cxy = []
        if (x0 && y0) {
            cxy = [x0, y0]
        } else {
            throw 'circle center (x0,y0) not exists'
        }


        let link
        /*分别计算thresh link下的内圆半径*/
        if (trend === 'rise') {
            link = data.link.sort((a, b) => {
                return b.delta - a.delta;
            })
        } else if (trend === 'drop') {
            link = data.link.sort((a, b) => {
                return a.delta - b.delta;
            })
        }

        let num
        if (trend === 'rise') {
            num = this.state.filter_num_rise
        } else if (trend === 'drop') {
            num = this.state.filter_num_drop
        }

        /*处理筛选item个数*/
        let thresh = link[num]
        let alpha;


        /*当num超出总的link的时候自动退出*/
        if (!thresh) {
            alert(`Please type in correct ${trend} num (0~${link.length})`)
            return
        }

        /*计算内外圆的半径*/
        let ang1, ang2
        data.axisnode.forEach(d => {
            if (d.uid === thresh.fromId) {
                ang1 = d.angle
            }
            if (d.uid === thresh.toId) {
                ang2 = d.angle
            }
        })


        /*判断是否要更改varia里面的步距*/
        if (!ang2 && ang2 !== 0) {
            throw 'Check if the axisnode and item values corresponded'
        }

        alpha = ang1 - ang2

        /*定义外圆和内圆的半径*/
        let R = 0.8 * y0
        let r = R * Math.cos(alpha > Math.PI / 2 ? Math.PI / 2 : alpha)
        let R_r = [R, r]


        if (trend === 'rise') {
            this.setState({
                innerAxis_rise: r
            })
        } else if (trend === 'drop') {
            this.setState({
                innerAxis_drop: r
            })
        }


        /*这个函数下面画图要用到*/
        let getExtentFromOutput = (data) => {
            let [min, max] = d3.extent(data.link.reduce((prev, cur) => {
                prev.push(cur.from, cur.to)
                return prev
            }, []))

            return [min, max];
        };


        /*画svg*/
        let [outerRadius, innerRadius] = R_r
        let [cx, cy] = cxy

        let max = getExtentFromOutput(data)[1], min = getExtentFromOutput(data)[0]


        /*判断是否要清除之前画的半圆*/
        function boolean$_clear_all(t) {
            if (t === 'rise' && !(d3.select('.axis-inner-rise').empty())) {
                return true
            }
            if (t === 'drop' && !(d3.select('.axis-inner-drop').empty())) {
                return true
            }

            return false
        }


        if (boolean$_clear_all(trend)) {
            svg.selectAll(`.${trend}`)
                .remove()
        }

        /* 创建包含dm的g，并且移动到指定位置 */
        svg = svg.append('g')
            .attr('class', `${trend}`)
            .attr('transform', `translate(${cx},${cy})`)

        //定义环形的映射比例尺
        let scale_rise = d3.scaleLinear()
            .domain([min, max])
            .range([Math.PI, 0])

        let scale_drop = d3.scaleLinear()
            .domain([min, max])
            .range([-Math.PI, 0])

        let scale = d3.scaleLinear()
            .domain([min, max])
            .range([trend === 'rise' ? Math.PI : -Math.PI, 0])

        this.setState({
            scale_rise: scale_rise,
            scale_drop: scale_drop
        })

        //画放射的标识虚线
        let radialLine = d3.radialLine()
            .angle(d => d.angle)
            .radius(d => d.radius)

        let strokeDataForPolarAxis = data.axisnode.map((d, i) => {
            return d.tick % 10 === 0 || d.uid === 0 || d.uid === data.axisnode.length ?
                [
                    {
                        angle: 0,
                        radius: 0
                    },
                    {
                        angle: d.angle,
                        radius: outerRadius
                    }
                ] : [];
        })

        svg.append('g')
            .selectAll('.radial-stroke')
            .data(strokeDataForPolarAxis)
            .enter()
            .append('path')
            .attr('class', 'radial-stroke')
            .attr('d', radialLine)


        //绘制半圆上inner坐标上的刻度
        let tick_inner = svg.append("g");

        var xTick = tick_inner
            .selectAll("g")
            .data(scale.ticks(20))
            .enter().append("g")
            .attr('class', `inner-tick-${trend}`)
            .attr("text-anchor", "middle")
            .attr("transform", function (d) {
                return "rotate(" + ((scale(d)) * 180 / Math.PI - 90) + ")translate(" + innerRadius + ",0)";
            });

        xTick
            .append("line")
            .attr("x2", (d, i) => {
                return d % 20 === 0 || d === 0 || d === 150 ? 7 : 4;
            })
            .attr("stroke", "rgb(82, 79, 79)")
            .attr('stroke-width', d => {
                return d % 20 === 0 || d === 0 || d === 150 ? 2 : 1;
            })


        /*绘制outer坐标上的刻度*/
        let xAxisOuter = svg.append("g");

        let xOuterTick = xAxisOuter
            .selectAll("g")
            .data(scale.ticks(max - min))//算出总tick数
            .enter().append("g")
            .attr("text-anchor", "middle")
            .attr("transform", function (d) {
                return "rotate(" + ((scale(d)) * 180 / Math.PI - 90) + ")translate(" + outerRadius + ",0)";
            });

        xOuterTick.append("line")
            .attr("x2", (d, i) => {
                return d % 20 === 0 || d === 0 || d === 150 ? 7 : 4;
            })
            .attr("stroke", "rgb(82, 79, 79)")
            .attr('stroke-width', d => {
                return d % 20 === 0 || d === 0 || d === 150 ? 2 : 1;
            });

        xOuterTick.append("text")
            .attr("transform", function (d) {
                /*FIXME: 问题出在scale*/
                var angle = scale_rise(d) + Math.PI / 2;
                return (angle < Math.PI) ? "rotate(90)translate(0,-14)" : "rotate(-90)translate(0, 18)";
            })
            .text(function (d) {
                return d === max || d === min ? d : (d % 5 === 0 ? d : null)/*TODO: 修改值以显示outer axis的text*/
            })
            .style("font-size", 12)
            .style('font-weight', 500)


        //绘制axis之间的link
        let dataForRadialLine = data.link.map((d, i) => {
            return [{
                uid: d.uid,
                name: d.name,
                fromId: d.fromId,
                toId: d.toId,
                from: d.from,
                to: d.to,
                delta: d.delta,
                angle: data.axisnode[d.fromId].angle,
                radius: innerRadius
            }, {
                angle: data.axisnode[d.toId].angle,
                radius: outerRadius
            }]
        })


        let links = svg.append('g')
            .selectAll('.link')
            .data(dataForRadialLine)
            .enter()
            .append('path')
            .attr('class', 'link' + `-${trend}`)
            .attr('d', radialLine)
            .attr('stroke', d => {
                return trend === 'rise' ? '#6ab04c' : '#eb4d4b'
            })
            .on('mouseover', this.mouseover)
            .on('mouseout', this.mouseout)


        if (!d3.select('clip' + `-${trend}`).empty()) {
            d3.select('clip' + `-${trend}`).remove()
        }


        //画D区域的link
        let clip = svg.append('defs')
            .append('clipPath')
            .attr('id', 'clip' + `-${trend}`)
            .append('circle')
            .attr('class', 'clip' + `-${trend}`)
            .attr('r', innerRadius)


        let links_d = svg.append('g')
            .attr('clip-path', `url(#clip-${trend})`)
            .selectAll('.link-d')
            .data(dataForRadialLine)
            .enter()
            .append('path')
            .attr('class', 'link-d' + `-${trend}`)
            .attr('d', radialLine)
            .attr('stroke', d => {
                return trend === 'rise' ? '#6ab04c' : '#eb4d4b'
            })
            .on('mouseover', this.mouseover)
            .on('mouseout', this.mouseout)


        //画outer环形坐标的圆
        svg.append('g')
            .append('path')
            .attr('class', 'axis-outer')
            .attr('d', d3.arc()
                .innerRadius(outerRadius)
                .outerRadius(outerRadius)
                .startAngle(trend === 'rise' ? 0 : Math.PI)
                .endAngle(trend === 'rise' ? Math.PI : 2 * Math.PI)
            )


        //画inner环形坐标的圆
        let innerCircle = svg.append('g')
            .append('path')
            .attr('class', `axis-inner-${trend === 'rise' ? 'rise' : 'drop'}`)
            .attr('d', d3.arc()
                .innerRadius(innerRadius)
                .outerRadius(innerRadius)
                .startAngle(trend === 'rise' ? 0 : Math.PI)
                .endAngle(trend === 'rise' ? Math.PI : 2 * Math.PI)
            )

        //画分割线
        let separation = svg
            .append('line')
            .attr('x1', 0)
            .attr('x2', 0)
            .attr('y1', -outerRadius)
            .attr('y2', outerRadius)
            .attr('stroke', 'rgb(82, 79, 79)')
            .attr('stroke-width', '1px')
            .attr('stroke-dasharray', '6,3')


    }


    /*画整个deltamap的graph*/
    draw_graph() {
        const width = this.state.width, height = this.state.height

        //define svg groups
        const svg = d3.select('#graph')
            .attr('width', width)
            .attr('height', height)


        axios.get('data/data.json')
            /*加载数据*/
            .then(d => {
                return d.data.data //取到data，传给下一个.then()
            })
            /*处理数据，设置state*/
            .then(d => {
                this.setState({
                    initData: d,
                    viewData: varia(d)
                })
            })
            /*用state中的数据画图*/
            .then(() => {
                let data = this.state.viewData
                //画rise或者drop的半圆
                this.draw_graph$_draw_semi(svg, data, 'rise')
                this.draw_graph$_draw_semi(svg, data, 'drop')
                this.draw_graph$_tooltip()

            })


    }


    handle_GUI_update(newData) {


        /*更新inner_drop的半径*/
        if (!d3.select('.axis-inner-drop').empty()) {
            d3.select('.axis-inner-drop').attr('d', d3.arc()
                .innerRadius(this.state.innerAxis_drop)
                .outerRadius(this.state.innerAxis_drop)
                .startAngle(Math.PI)
                .endAngle(2 * Math.PI)
            )
        }


    }


    handle_filter_num_rise(event) {
        let _this = this

        /*判断有没有rise部分*/
        if (d3.select('.axis-inner-rise').empty()) {
            alert('No rise to update')
            return
        }

        let promise = new Promise(function (resolve, reject) {
            /*更新state的filter_num_rise*/
            let value = event.target.value
            if (typeof value === "string") {
                value = Number(value)
                _this.setState({filter_num_rise: value});
            }
            resolve()
        })

        promise.then(() => {
            /*更新视图*/
            this.draw_graph$_draw_semi(d3.select('#graph'), this.state.viewData, 'rise')
        })
    }


    handle_filter_num_drop(event) {
        let _this = this

        /*判断有没有rise部分*/
        if (d3.select('.axis-inner-drop').empty()) {
            alert('No drop to update')
            return
        }

        let promise = new Promise(function (resolve, reject) {
            /*更新state的filter_num_drop*/
            let value = event.target.value
            if (typeof value === "string") {
                value = Number(value)
                _this.setState({filter_num_drop: value});
            }
            resolve()
        })

        promise.then(() => {
            /*更新视图*/
            this.draw_graph$_draw_semi(d3.select('#graph'), this.state.viewData, 'drop')
        })
    }


    handle_controller_rise() {
        let _this = this
        let data = this.state.viewData.rise
        let trend = 'rise'
        let x0 = $('#graph').height() / 2
        let y0 = $('#graph').height() / 2
        let outerRadius = 0.8 * y0
        let value = $('#controller_rise').val()


        /*判断有没有rise部分*/
        if (d3.select('.axis-inner-rise').empty() ||
            d3.select('.inner-tick-rise').empty() ||
            d3.select('.link-rise').empty() ||
            d3.select('.link-d-rise').empty()

        ) {
            alert('No rise to update')
            return
        }

        let promise = new Promise(function (resolve) {
            _this.setState({
                innerAxis_rise: Number(value)
            })

            resolve()
        })

        let innerRadius = this.state.innerAxis_rise

        promise.then(function () {
            /*更新inner_rise的半径*/
            if (!d3.select('.axis-inner-rise').empty()) {
                d3.select('.axis-inner-rise').attr('d', d3.arc()
                    .innerRadius(innerRadius)
                    .outerRadius(innerRadius)
                    .startAngle(0)
                    .endAngle(Math.PI)
                )
            }

            /*更新inner axis上的ticks*/
            d3.selectAll('.inner-tick-rise')
                .attr("transform", function (d) {
                    return "rotate(" + ((_this.state.scale_rise(d)) * 180 / Math.PI - 90) + ")translate(" + innerRadius + ",0)";
                })

            /*更新细link*/
            let dataForRadialLine = data.link.map((d, i) => {
                return [{
                    uid: d.uid,
                    name: d.name,
                    fromId: d.fromId,
                    toId: d.toId,
                    from: d.from,
                    to: d.to,
                    delta: d.delta,
                    angle: data.axisnode[d.fromId].angle,
                    radius: innerRadius
                }, {
                    angle: data.axisnode[d.toId].angle,
                    radius: outerRadius
                }]
            })
            d3.selectAll('.link-rise').remove()
            let radialLine = d3.radialLine()
                .angle(d => d.angle)
                .radius(d => d.radius)

            d3.select('.rise')
                .append('g')
                .selectAll('.link')
                .data(dataForRadialLine)
                .enter()
                .append('path')
                .attr('class', 'link-rise')
                .attr('d', radialLine)
                .attr('stroke', '#6ab04c')
                .on('mouseover', _this.mouseover)
                .on('mouseout', _this.mouseout)

            /*更新link-d*/

            if (!d3.select('#clip-rise').empty()) {
                d3.select('#clip-rise').remove()
            }

            //画D区域的link
            let clip = d3.select('.rise')
                .append('defs')
                .append('clipPath')
                .attr('id', 'clip-rise')
                .append('circle')
                .attr('class', 'clip-rise')
                .attr('r', innerRadius)


            d3.selectAll('.link-d-rise').remove()

            d3.select('.rise')
                .append('g')
                .attr('clip-path', `url(#clip-rise)`)
                .selectAll('.link-d')
                .data(dataForRadialLine)
                .enter()
                .append('path')
                .attr('class', 'link-d-rise')
                .attr('d', radialLine)
                .attr('stroke', '#6ab04c')
                .attr('stroke-width', 2)
                .on('mouseover', _this.mouseover)
                .on('mouseout', _this.mouseout)


            /*更新坐标轴*/
            //画inner环形坐标的圆
            d3.selectAll('.axis-inner-rise').remove()
            let innerCircle = d3.select('.rise')
                .append('g')
                .append('path')
                .attr('class', `axis-inner-rise`)
                .attr('d', d3.arc()
                    .innerRadius(innerRadius)
                    .outerRadius(innerRadius)
                    .startAngle(0)
                    .endAngle(Math.PI)
                )

        })

    }


    handle_controller_drop() {
        let _this = this
        let data = this.state.viewData.drop
        let x0 = $('#graph').height() / 2
        let y0 = $('#graph').height() / 2
        let outerRadius = 0.8 * y0
        let value = $('#controller_drop').val()

        /*判断有没有drop部分*/
        if (d3.select('.axis-inner-drop').empty() ||
            d3.select('.inner-tick-drop').empty() ||
            d3.select('.link-drop').empty() ||
            d3.select('.link-d-drop').empty()

        ) {
            alert('No drop to update')
            return
        }

        let promise = new Promise(function (resolve) {
            _this.setState({
                innerAxis_drop: Number(value)
            })

            resolve()
        })

        let innerRadius = this.state.innerAxis_drop

        promise.then(function () {
            /*更新inner_drop的半径*/
            if (!d3.select('.axis-inner-drop').empty()) {
                d3.select('.axis-inner-drop').attr('d', d3.arc()
                    .innerRadius(innerRadius)
                    .outerRadius(innerRadius)
                    .startAngle(Math.PI)
                    .endAngle(2 * Math.PI)
                )
            }

            /*更新inner axis上的ticks*/
            d3.selectAll('.inner-tick-drop')
                .attr("transform", function (d) {
                    return "rotate(" + ((_this.state.scale_drop(d)) * 180 / Math.PI - 90) + ")translate(" + innerRadius + ",0)";
                })

            /*更新细link*/
            let dataForRadialLine = data.link.map((d, i) => {
                return [{
                    uid: d.uid,
                    name: d.name,
                    fromId: d.fromId,
                    toId: d.toId,
                    from: d.from,
                    to: d.to,
                    delta: d.delta,
                    angle: data.axisnode[d.fromId].angle,
                    radius: innerRadius
                }, {
                    angle: data.axisnode[d.toId].angle,
                    radius: outerRadius
                }]
            })
            d3.selectAll('.link-drop').remove()
            let radialLine = d3.radialLine()
                .angle(d => d.angle)
                .radius(d => d.radius)

            d3.select('.drop')
                .append('g')
                .selectAll('.link')
                .data(dataForRadialLine)
                .enter()
                .append('path')
                .attr('class', 'link-drop')
                .attr('d', radialLine)
                .attr('stroke', '#eb4d4b')
                .on('mouseover', _this.mouseover)
                .on('mouseout', _this.mouseout)

            /*更新link-d*/

            if (!d3.select('#clip-drop').empty()) {
                d3.select('#clip-drop').remove()
            }

            //画D区域的link
            let clip = d3.select('.drop')
                .append('defs')
                .append('clipPath')
                .attr('id', 'clip-drop')
                .append('circle')
                .attr('class', 'clip-drop')
                .attr('r', innerRadius)


            d3.selectAll('.link-d-drop').remove()

            d3.select('.drop')
                .append('g')
                .attr('clip-path', `url(#clip-drop)`)
                .selectAll('.link-d')
                .data(dataForRadialLine)
                .enter()
                .append('path')
                .attr('class', 'link-d-drop')
                .attr('d', radialLine)
                .attr('stroke', '#eb4d4b')
                .attr('stroke-width', 2)
                .on('mouseover', _this.mouseover)
                .on('mouseout', _this.mouseout)


            /*更新坐标轴*/
            //画inner环形坐标的圆
            d3.selectAll('.axis-inner-drop').remove()
            let innerCircle = d3.select('.drop')
                .append('g')
                .append('path')
                .attr('class', `axis-inner-drop`)
                .attr('d', d3.arc()
                    .innerRadius(innerRadius)
                    .outerRadius(innerRadius)
                    .startAngle(Math.PI)
                    .endAngle(2 * Math.PI)
                )


        })

    }

    draw_graph$_tooltip(){
        //定义tooltip的selection
        let div = d3.select('.graph_container')
            .append('div')
            .attr('id', 'tooltip')
            .style('opacity', 0);
    }


    /*mouseover_filtrate交互*/
    mouseover(d,i){
        let event = window.event
        let div = d3.select('#tooltip')
            .style('opacity', 0.95);
        div.html(`Item: ${d[0].name}</br>Initial: ${d[0].from}</br>Final: ${d[0].to}</br>Change: ${d[0].delta}`)
            .style("top", (event.offsetY) + "px")
            .style('left', (event.offsetX) + "px")
    }


    /*mouseout_filtrate交互*/
    mouseout(d,i){
        d3.select('#tooltip')
            .style("opacity", 0);
    }



    componentDidMount() {
        this.draw_graph()
    }


    render() {
        //设置GUI的默认值

        return (
            <div className={'container'}>

                <div className={'graph_container'}>
                    <svg id={'graph'}></svg>
                </div>

                <div className="control">

                    <div className="control-left">

                        <div className="form-group">
                            <label>inner radius drop</label>
                            <input type="range"
                                   className={'form-control-range'}
                                   min={0}
                                   max={200}
                                   value={this.state.innerAxis_drop}
                                   id="controller_drop"
                                   step={5}
                                   onChange={this.handle_controller_drop}/>
                        </div>


                        <div>
                            <label className="control-label">drop num</label>
                            <input type="text" className="form-control"
                                   value={this.state.filter_num_drop}
                                   onChange={this.handle_filter_num_drop}
                            />
                        </div>

                    </div>

                    <div className="control-right">


                        <div className="form-group">
                            <label>inner radius rise</label>
                            <input type="range"
                                   className={'form-control-range'}
                                   min={0}
                                   max={200}
                                   value={this.state.innerAxis_rise}
                                   id="controller_rise"
                                   step={5}
                                   onChange={this.handle_controller_rise}/>
                        </div>


                        <div>
                            <label className="control-label">rise num</label>
                            <input type="text" className="form-control"
                                   value={this.state.filter_num_rise}
                                   onChange={this.handle_filter_num_rise}
                            />
                        </div>

                    </div>


                </div>

            </div>


        )
    }
}


export default Deltamap;
