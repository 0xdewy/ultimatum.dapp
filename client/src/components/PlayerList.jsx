import React from 'react';

import { List, Avatar } from 'antd';


export default class PlayerList extends React.Component {
    constructor(props) {
        super(props);
        this.state = { loading: true };

    }



    render() {
        return (
            <div style={{width: "600px"}}>
                <List
                    bordered={true}
                    loading={this.state.loading}
                    itemLayout="horizontal"
                    dataSource={this.props.lottery.participants}
                    renderItem={participant => (
                        <List.Item>
                            <List.Item.Meta
                                avatar={<Avatar src={this.props.userAvatar[participant]} />}
                                description={participant}
                            />
                        </List.Item>
                    )}
                />

            </div>

        )
    }

    componentDidMount() {
        this.setState({ loading: false });
        console.log("LOTTERY OBJECT ", this.props.lottery)
    }
}

