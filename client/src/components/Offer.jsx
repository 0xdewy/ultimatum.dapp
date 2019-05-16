import React from 'react';

import {Icon, Slider, Row, Col, Layout, Button} from 'antd';

export default class Offer extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            loading: true,
            value: 50
        };
    }

    handleChange = value => {
        this.setState({ value });
    };

    makeOffer = () => { 
        let {value} = this.state;
        this.props.makeOffer(value); 

    }

    render() {
        const max = this.props.game.ethSum;
        const min = 0;
        const { value } = this.state;
        const mid = ((max - min) / 2).toFixed(5);
        const preColor = value >= mid ? '' : 'rgba(0, 0, 0, .45)';
        const nextColor = value >= mid ? 'rgba(0, 0, 0, .45)' : '';

        return (
            <div style={{width:"40%", backgroundColor:"white"}}>
            <Row type="flex" align="middle" justify="center" >
            <Col xs={10} sm={12} md={14} lg={16} xl={18}>
                <h2> Decide how much of the pot to split with opponent </h2>
            </Col>
            </Row>

            {/* <div> */}
                <br></br>
                {/* </div> */}

            <Row type="flex" align="middle" justify="center" >
                <Col>
                <Icon style={{ color: preColor }} type="frown-o" />
                </Col>

                <Col xs={10} sm={12} md={14} lg={16} xl={18}>
                <Slider {... this.props} onChange={this.handleChange} value={value} />
                </Col>

                <Col>
                <Icon style={{ color: nextColor }} type="smile-o" />
                </Col>
         
                </Row>
                <br></br>
                <Button > Make Offer </Button> 
                </div>
        )
    }
}