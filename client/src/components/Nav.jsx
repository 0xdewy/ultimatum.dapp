import React from 'react';
import makeBlockie from 'ethereum-blockies-base64';

import { Menu } from 'antd';
import '../App.css';




class Nav extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            someKey: 'someValue',
            blocky: null
        };

    }


    createBlocky = () => {
        let { address } = this.props.user;
        if (address === '' || address === undefined || address === null)
            address = 'guest'
        let blocky = makeBlockie(address);
        this.setState({ blocky })
    }


    render() {
        let { balance } = this.props.user;
        return (
            <Menu theme="transparent" mode="horizontal" defaultSelectedKeys={['1']} style={{ lineHeight: '64px' }}
            >

                <Menu.Item key="1">
                    <img className="addrBlocky" src={this.state.blocky} />
                    <span className="pad">  </span>
                    <span>ETH {(balance / 10 ** 18).toFixed(2)} </span>
                </Menu.Item>


                <Menu.Item key="2">Players</Menu.Item>
                <Menu.Item key="3">Your Games</Menu.Item>


                <Menu.Item className="navSpace"></Menu.Item>








            </Menu>


        )
    }

    componentDidMount() {
        this.createBlocky();
    }
}

{/* <AutoComplete
style={{ width: 200 }}
dataSource={dataSource}
placeholder="filter by category"
filterOption={(inputValue, option) => option.props.children.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1}
>
<Input suffix={<Icon type="search" className="certain-category-icon" />} />
</AutoComplete> */}

export default Nav;
