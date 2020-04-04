import React from "react";
import ReactDOM from "react-dom";
import { Map, TileLayer, Marker, Popup } from "react-leaflet";

class LeafletMap extends React.Component {
  constructor(props) {
      super(props);
    this.state = {

    }
  }

  render() {
    const position = [this.state.lat, this.state.lng];
    return (
      <Map center={position} zoom={this.state.zoom}>
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url='https://{s}.tile.osm.org/{z}/{x}/{y}.png'
        />
        <Marker position={position}>
          <Popup>
            A pretty CSS3 popup. <br/> Easily customizable.
          </Popup>
        </Marker>
      </Map>
    );
  }
}


ReactDOM.render(<LeafletMap />, document.getElementById('leaflet-map'));
