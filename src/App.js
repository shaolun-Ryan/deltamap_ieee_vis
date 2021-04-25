import React, {Component} from 'react'
import {
  BrowserRouter as Router,
  Switch,
  Route
} from "react-router-dom";


import Home from "./Components/Home";
import Deltamap from './Components/Deltamap'
import Stacked_bar_chart from "./Components/Stacked_bar_chart";
import Grouped_bar_chart from "./Components/Grouped_bar_chart";



class App extends Component {
  render(){
    return(
        <Router>
          <div>

            <nav className="navbar navbar-expand-lg navbar-light" style={{backgroundColor:"rgba(227,242,253,0.41)"}}>
              <div className="collapse navbar-collapse" id="navbarNavAltMarkup">
                <div className="navbar-nav">
                  <a className="nav-link" href="/deltamap" >Delta_map</a>
                  <a className="nav-link" href="/stacked_bar_chart">Stacked_bar_chart</a>
                  <a className="nav-link" href="/grouped_bar_chart">Grouped_bar_chart</a>
                </div>
              </div>
            </nav>

            {/*设置url对组件的映射*/}
            <Switch>
              <Route exact path="/">
                <Home />
              </Route>
              <Route path="/deltamap">
                <Deltamap />
              </Route>
              <Route path="/stacked_bar_chart">
                <Stacked_bar_chart />
              </Route>
              <Route path="/grouped_bar_chart">
                <Grouped_bar_chart />
              </Route>
            </Switch>
          </div>
        </Router>
    )
  }
}

export default App;

