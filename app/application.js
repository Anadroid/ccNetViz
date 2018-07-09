var Application = React.createClass({displayName: "Application",
    mixins: [Frame],

    render: function() {
        var wp = { parentWidth: this.state.width, parentHeight: this.state.height };

        return (
            React.createElement("div", null, 
                React.createElement(Banner, React.__spread({},  wp))
            )
        );
    }
});
