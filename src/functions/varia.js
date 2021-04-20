import * as d3 from 'd3'

let varia = (arr) =>{

    /* **************Begin to build origin data******************** */


    let dataOrigin = {
        rise:{
            axisnode:[],
            link:[]
        },
        drop:{
            axisnode:[],
            link:[]
        },
    }

    /* 按对象的排布顺序找出name,start和end字段 */
    let [name,start,end] = Object.keys(arr[0])

    /*把initData按rise和drop分成两组*/
    let arr_rise = [], arr_drop = []
    arr.forEach(d=>{
        if(d[end] - d[start]>=0){
            arr_rise.push(d)
            return
        }
        if(d[end] - d[start]<0){
            arr_drop.push(d)
            return
        }
        return
    })

    let [min_rise, max_rise] = getExtent(arr_rise)
    let [min_drop, max_drop] = getExtent(arr_drop)

    /*计算step，保证每一个值都能生成对应的左边点，而不存在值找不到左边点的情况*/
    function handle_step(arr){
       let each_is_int = arr.every(d=>{
           return d[start]%1==0 && d[end]%1==0
       })
        return each_is_int?1:0.05 //TODO: 如果因为所有值里有跃过这两个值的，则修改0.05为更小的值
    }


    dataOrigin.rise.link = arr_rise.map((d,i)=>{
        return {
            name: d[name],
            start: d[start],
            end: d[end]
        }
    })
    dataOrigin.drop.link = arr_drop.map((d,i)=>{
        return {
            name: d[name],
            start: d[start],
            end: d[end]
        }
    })

    dataOrigin.rise.axisnode = d3.range(min_rise, max_rise+1, handle_step(dataOrigin.rise.link))
    dataOrigin.drop.axisnode = d3.range(min_drop, max_drop+1, handle_step(dataOrigin.drop.link))


    /* **************Begin to build output data******************** */

    let dataOutput = {
        rise:{
            axisnode:[],
            link:[]
        },
        drop:{
            axisnode:[],
            link:[]
        }
    }

    let angle_rise = d3.scaleLinear()
        .domain([max_rise,min_rise])
        .range([0, Math.PI])
    let angle_drop = d3.scaleLinear()
        .domain([max_drop,min_drop])
        .range([0, Math.PI])

    dataOutput.rise.axisnode = dataOrigin.rise.axisnode.map((d, i)=>{
        return {
            uid: i,
            tick: d,
            angle: angle_rise(d)
        }
    })
    dataOutput.drop.axisnode = dataOrigin.drop.axisnode.map((d, i)=>{
        return {
            uid: i,
            tick: d,
            angle: -angle_drop(d)
        }
    })

    let fromArray_rise = [], toArray_rise = []
    dataOutput.rise.link = dataOrigin.rise.link.map((d,i)=>{
        let from = d.start, to = d.end

        let fromArrayEle = dataOutput.rise.axisnode.findIndex((item)=>{
            return item.tick === from
        })
        fromArray_rise.push(fromArrayEle)

        let toArrayEle = dataOutput.rise.axisnode.findIndex((item)=>{
            return item.tick === to
        })
        toArray_rise.push(toArrayEle)

        return {
            uid: i,
            name: d.name,
            fromId: fromArray_rise[i],
            toId: toArray_rise[i],
            from: d.start,
            to: d.end,
            delta: d.end - d.start
        }
    })

    let fromArray_drop = [], toArray_drop = []
    dataOutput.drop.link = dataOrigin.drop.link.map((d,i)=>{
        let from = d.start, to = d.end

        let fromArrayEle = dataOutput.drop.axisnode.findIndex((item)=>{
            return item.tick === from
        })
        fromArray_drop.push(fromArrayEle)

        let toArrayEle = dataOutput.drop.axisnode.findIndex((item)=>{
            return item.tick === to
        })
        toArray_drop.push(toArrayEle)

        return {
            uid: i,
            name: d.name,
            fromId: fromArray_drop[i],
            toId: toArray_drop[i],
            from: d.start,
            to: d.end,
            delta: d.end - d.start
        }
    })

    return dataOutput

}




let getExtent = (arr)=>{
    if(!arr[0]){
        return []
    }

    /* 按对象的排布顺序找出name,start和end字段 */
    let [name,start,end] = Object.keys(arr[0])

    /* 求出始末值分布的最大和最小区间 , 是解构语法*/
    let [min,max] = d3.extent(arr.reduce((prev,cur)=>{
        prev.push(+cur[start], +cur[end])
        return prev
    },[]))

    return [min,max];
};


export {
    varia
}