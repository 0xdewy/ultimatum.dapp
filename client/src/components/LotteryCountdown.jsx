import React from 'react';

import  { Statistic, Row, Col } from 'antd';

const Countdown = Statistic.Countdown;


class LotteryCountdown extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            deadline: Date.now() + 1000 * 69
        };

    }

    onFinish = () => {
        console.log('finished!');
    }


    render() {
        let { deadline } = this.state;
        return (

                <Col span={12}>
                    <Countdown title="Countdown" value={deadline} onFinish={this.onFinish} />
                </Col>

        );
    }

    componentDidMount() {
        this.setState({ someKey: 'otherValue' });
    }

}

export default LotteryCountdown;
