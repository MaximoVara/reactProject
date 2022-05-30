import logo from './logo.svg';
import './App.css';
import React, { useEffect, useState } from "react"
import ReactPaginate from 'react-paginate';
import {GoogleMap, useJsApiLoader, withScriptjs, withGoogleMap, Circle, Marker} from '@react-google-maps/api';

function GetScraper(){
  const [myresults, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const getCoordinates = async (address) => {
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=AIzaSyDFSYQa0JsOT613dIzdarx7WT15--RQHZ4`);
      const data = await response.json();

      return {
          lat: data.results[0].geometry.location.lat,
          lng: data.results[0].geometry.location.lng
      };
  }

  useEffect(() => {
      (async () => {
          const urls = [ 
            "http://localhost:9000/vi/1",
            "http://localhost:9000/vi/2"
          ];
          const events = [ ];
          setLoading(true);
          for(let i = 0; i < urls.length; ++i) {
            const response = await fetch(urls[i]); //
            const { results } = await response.json(); //
            
            const latLongPromises = results.map(event => new Promise(async (resolve, reject) => {
                resolve({ ...event, geo: await getCoordinates(event.address) });
            }));
            
            for(let i = 0; i < latLongPromises.length; ++i) {
                const p = latLongPromises[i];
            
                const event = await p;
            
                events.push(event);
            }
          }
      
          setResults(events);
          setLoading(false);
          setError(false);
      })();
  }, [ ]);
  return (
    <>
      <h1>Events</h1>
      {loading && <div>A moment please...</div>}
      {error && (
        <div>{`There is a problem fetching the post data - ${error}`}</div>
      )}
      <input onChange={(e) => {
        setSearch(e.target.value);
      }} />
      <PaginateItems itemsPerPage={5} 
        results={myresults.filter(event => {
          if(search === "") return true
          return (event.title.toLowerCase()).includes(search.toLowerCase());
      })}/>
    </>
  );
}

function Items({ currentItems }) {
  return (
    <>
      <ul>
        {currentItems &&
          currentItems.map(({ title, eventURL, date, time, address }) => (
            <li>
              <h3>Title:  {title}</h3>
              <h3>Event URL: {eventURL}</h3>
              <h3>Date Time: {date} {time}</h3>
              <h3>Location: {address}</h3>
              <h3></h3>
            </li>
          ))}
      </ul>
    </>
  );
}

function PaginateItems( {itemsPerPage, results} ){
  const [currentItems, setCurrentItems] = useState([]);
  const [pageCount, setPageCount] = useState(0);
  const [itemOffset, setItemOffset] = useState(0);

  useEffect(() => {
    const endOffset = itemOffset + itemsPerPage;
    setCurrentItems(results.slice(itemOffset, endOffset));
    setPageCount(Math.ceil(results.length / itemsPerPage));
  }, [itemOffset, itemsPerPage, results.length]);

  // Invoke when user click to request another page.
  const handlePageClick = (event) => {
    const newOffset = (event.selected * itemsPerPage) % results.length;
    console.log(
      `User requested page number ${event.selected}, which is offset ${newOffset}`
    );
    setItemOffset(newOffset);
  };

  return (
    <>
      <MyGoogleMap markers={currentItems.map(event => event.geo)} />
      <Items currentItems={currentItems} />
      <ReactPaginate
        breakLabel="..."
        nextLabel="next >"
        onPageChange={handlePageClick}
        pageRangeDisplayed={10}
        pageCount={pageCount}
        previousLabel="< previous"
        renderOnZeroPageCount={null}
      />
    </>
  );
}

function MyGoogleMap({markers}) {
  const googleKey = "AIzaSyDFSYQa0JsOT613dIzdarx7WT15--RQHZ4" 
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleKey
  })

  const [map, setMap] = React.useState(null)

  const onLoad = React.useCallback(function callback(map) {
    const bounds = new window.google.maps.LatLngBounds(center);
    map.fitBounds(bounds);
    setMap(map)
  }, [])

  const onUnmount = React.useCallback(function callback(map) {
    setMap(null)
  }, [])

  const containerStyle = {
    width: '400px',
    height: '400px'
  };
  
  const center = {
    lat: 39.7881841,
    lng: -86.2385666
  };
  return isLoaded ? (
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={-5}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        { 
          markers.map(position => <Marker onLoad={() => console.log(position)} position={position}/>)
        }
        <></>
      </GoogleMap>
  ) : <></>
}

function App() {
  return (
    <div className="App">
      <GetScraper />
    </div>
  );
}

export default React.memo(App);