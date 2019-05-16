import React from 'react';

import { Statistic, Row, Col, Layout } from 'antd';

const Countdown = Statistic.Countdown;


class LotteryCountdown extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            title: "Blocks Left"
        };

    }

    onFinish = () => {
        let { title } = this.state;
        title = "Lottery Finished";
        console.log('finished!');
        this.setState({ title });
    }

    checkFinish = () => {
        let { lottery } = this.props;
        if (lottery.finished && lottery.participants.length < 2) {
            return "Lottery needs more participants";
        }
        else if (lottery.finished && lottery.participants >= 2) {
            return "Lottery finished. Click start start new lottery";
        }

        return "Blocks Left"

    }


    render() {
        let { title } = this.state;
        title = this.checkFinish();
        return (
            <Layout style={{backgroundColor: "white"}}>
                <Row>
                    <Col>
                        <h2> {this.props.lottery.title}</h2>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <h2> {this.props.blocksLeft} Blocks Left</h2>
                    </Col>
                </Row>

            </Layout>




        );
    }

    componentDidMount() {
        this.setState({ someKey: 'otherValue' });
        console.log("COUNTDOWN COMPONENT BLOCKS LEFT ", this.props.blocksLeft);
        console.log("COUNTDOWN COMPONENT LOTTERY ", this.props.lottery);

    }

}

export default LotteryCountdown;
