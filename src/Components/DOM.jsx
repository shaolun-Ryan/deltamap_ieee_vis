import React, {Component} from 'react';
import '../statics/style/test.css'
import axios from 'axios'

class DOM extends Component {
    constructor(props){
        super(props);
        this.state = {
            item : 'react component'
        }
    }

    componentDidMount(){
        axios.get('data/data.json')
            .then(data=>{
                console.log(data)
            })
    }

    render(){

        return(
            <div className={'test'}>
                <h1>I'm a child component from </h1>
            </div>
        )
    }
}

export default DOM;
