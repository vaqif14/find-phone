import React from "react";
import { connect } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";
import {
  withGoogleMap,
  GoogleMap,
  Marker,
  Circle,
  InfoWindow,
} from "react-google-maps";
import styled, { createGlobalStyle } from "styled-components";
import Pointer from "../../assets/pointer.png";

import {
  ZoomInIcon,
  ZoomOutIcon,
  HelpIcon,
  OndemandVideoIcon,
  FlagIcon,
} from "../../icons";
import {
  ReduxState,
  setZoomLevel,
  setTooltip,
  setFaqVisibility,
  setDemoVisibility,
  setSchoolDetailPin,
} from "../../store";

import { googleMapsStyles } from "../../constants";
import { Markers, Pois, Polygons, SchoolDetailPin, Tooltip } from "./lib";
import { i18n } from "../../index";
import { determineLanguage, setLanguage } from "../../locales/utils";

const GlobalGoogleMapsAttributionOffset = createGlobalStyle`
	@media (max-width: 900px) {
		.gm-style-cc {
			transform: translate(-4.7rem,-5.5rem);
		}
	}
`;

const StyledAttribution = styled.p`
  position: absolute;
  bottom: 1.5rem;
  right: 5.5rem;
  white-space: nowrap;
  font-size: 0.75rem;
  color: #888;

  a {
    color: #4286f4;
    text-decoration: none;
  }

  @media (max-width: 900px) {
    bottom: 7rem;
    right: 5rem;
  }
`;

const StyledControls = styled.div`
  position: absolute;
  z-index: 100;

  @media (min-width: 900px) {
    bottom: 1.5rem;
    right: 1.5rem;
  }

  @media (max-width: 900px) {
    bottom: 4.75rem;
    right: 1rem;
  }
`;

const StyledControlsGroup = styled.div`
  padding: 0.5rem;
  margin-top: 0.5rem;
  background: #fff;
  border-radius: 3px;
`;

const StyledControlsItem = styled.div`
  cursor: pointer;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:not(:first-child) {
    margin-top: 0.5rem;
  }
`;

interface StateProps {
  travelTimes: ReduxState["travelTime"]["travelTimes"];
  tooltip: ReduxState["application"]["tooltip"];
  schoolDetailPin: ReduxState["application"]["schoolDetailPin"];
}
interface DispatchProps {
  setZoomLevel: typeof setZoomLevel;
  setTooltip: typeof setTooltip;
  setFaqVisibility: typeof setFaqVisibility;
  setDemoVisibility: typeof setDemoVisibility;
  setSchoolDetailPin: typeof setSchoolDetailPin;
}
interface Props {}
type PropsUnion = StateProps & DispatchProps & Props;

interface State {
  showTooltip: boolean;
}

export function Component() {
  const mapRef = React.useRef<GoogleMap>(null);
  const [showTooltip, setShowTooltip] = React.useState(false);
  const animateFitToBounds = (
    travelTimes: NonNullable<ReduxState["travelTime"]["travelTimes"]>
  ) => {
    if (!mapRef.current) {
      return;
    }

    let north = 0;
    let east = 0;
    let south = 40;
    let west = 49;

    for (const coordinate of travelTimes
      .map((v) => v.res.shapes.map((s) => s.shell))
      .flat(2)) {
      north = Math.max(north, 40.378395);
      east = Math.max(east, 49.840288);
      south = Math.min(south, 40.378395);
      west = Math.min(west, 49.840288);
    }

    const zoomLevel = Math.min(
      getBoundsZoomLevel(
        new google.maps.LatLngBounds(
          { lat: south, lng: west },
          { lat: north, lng: east }
        ),
        {
          width: window.innerWidth,
          height: window.innerHeight,
        }
      ),
      12
    );

    if (mapRef.current.getZoom() !== zoomLevel) {
      zoomTo(
        mapRef.current.getZoom(),
        zoomLevel,
        mapRef.current.getZoom() > zoomLevel ? "out" : "in"
      );
    }

    mapRef.current.panTo({
      lat: (north + south) / 2,
      lng: (east + west) / 2,
    });
  };

  const zoom = (zoomDirection: "in" | "out") => {
    if (!mapRef.current) {
      return;
    }
    const currentZoom = mapRef.current.getZoom();
    if (currentZoom < 7 && currentZoom > 15) {
      return;
    }
    zoomTo(
      currentZoom,
      zoomDirection === "in" ? currentZoom + 1 : currentZoom - 1,
      zoomDirection
    );
  };

  const zoomTo = (
    currentZoom: number,
    endStop: number,
    zoomDirection: "in" | "out"
  ) => {
    if (
      !mapRef.current ||
      (zoomDirection === "in" && currentZoom >= endStop) ||
      (zoomDirection === "out" && currentZoom <= endStop)
    ) {
      return;
    }

    const nextZoom =
      Math.round((currentZoom + (zoomDirection === "in" ? +0.2 : -0.2)) * 10) /
      10;

    mapRef.current.context.__SECRET_MAP_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.setZoom(
      nextZoom
    );

    setTimeout(() => {
      zoomTo(nextZoom, endStop, zoomDirection);
    }, 25);
  };

  function getBoundsZoomLevel(
    bounds: google.maps.LatLngBounds,
    mapDim: { width: number; height: number }
  ): number {
    const WORLD_DIM = { height: 256, width: 256 };
    const ZOOM_MAX = 21;

    function latRad(lat: number) {
      const sin = Math.sin((lat * Math.PI) / 180);
      const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
      return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
    }

    function zoom(mapPx: number, worldPx: number, fraction: number) {
      return Math.floor(Math.log(mapPx / worldPx / fraction) / Math.LN2);
    }

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    const latFraction = (latRad(ne.lat()) - latRad(sw.lat())) / Math.PI;

    const lngDiff = ne.lng() - sw.lng();
    const lngFraction = (lngDiff < 0 ? lngDiff + 360 : lngDiff) / 360;

    const latZoom = zoom(mapDim.height, WORLD_DIM.height, latFraction);
    const lngZoom = zoom(mapDim.width, WORLD_DIM.width, lngFraction);

    return Math.min(latZoom, lngZoom, ZOOM_MAX);
  }
  const MapFactory = withGoogleMap((props: any) => (
    <GoogleMap
      defaultZoom={15}
      defaultCenter={{
        lat: 40.378395,
        lng: 49.840288,
      }}
      defaultOptions={{
        streetViewControl: false,
        scaleControl: false,
        mapTypeControl: false,
        zoomControl: false,
        rotateControl: false,
        fullscreenControl: false,
        disableDefaultUI: true,
        clickableIcons: false,
        styles: googleMapsStyles,
        gestureHandling: "greedy",
      }}
      // onZoomChanged={() =>
      //   props.setZoomLevel(Math.round(mapRef.current!.getZoom()))
      // }
      // onDblClick={() =>
      //   setTooltipTimeout && clearTimeout(setTooltipTimeout)
      // }
      onClick={(e: any) => {
        const location = {
          lat: 40.378395,
          lng: 49.840288,
        };
        const geocoder = new google.maps.Geocoder();
        console.log("location", geocoder);

        geocoder.geocode({ location }, (results) => {
          console.log(results);
        });
      }}
    >
      <GlobalGoogleMapsAttributionOffset />

      <Pois />
      <Polygons />
      <Circle
        center={{ lat: 40.378395, lng: 49.840288 }}
        radius={300}
        options={{
          strokeColor: "#0000FF",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: "#0000FF",
          fillOpacity: 0.35,
        }}
      />
      <Marker
        position={{ lat: 40.378395, lng: 49.840288 }}
        onClick={() => {
          setShowTooltip(true);
        }}
        icon={{
          url: Pointer,
          scaledSize: new window.google.maps.Size(50, 50),
          origin: new window.google.maps.Point(0, 0),
          anchor: new window.google.maps.Point(25, 25),
        }}
      />
      {showTooltip && (
        <InfoWindow
          position={{ lat: 40.378395, lng: 49.840288 }}
          onCloseClick={() => {
            setShowTooltip(false);
          }}
        >
          <div>
            <button
              style={{
                border: "none",
                backgroundColor: "orange",
                color: "white",
                cursor: "pointer",
                marginRight: "10px",
                padding: 10,
              }}
            >
              Send Notification
            </button>
            <button
              style={{
                border: "none",
                backgroundColor: "red",
                color: "white",
                cursor: "pointer",
                marginRight: "10px",
                padding: 10,
              }}
            >
              SOS
            </button>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  ));

  return (
    <MapFactory
      containerElement={
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
          }}
        />
      }
      mapElement={<div style={{ height: `100%` }} />}
    />
  );
}
const mapStateToProps = (state: ReduxState) => ({
  travelTimes: state.travelTime.travelTimes,
  tooltip: state.application.tooltip,
  schoolDetailPin: state.application.schoolDetailPin,
});

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      setZoomLevel,
      setTooltip,
      setFaqVisibility,
      setDemoVisibility,
      setSchoolDetailPin,
    },
    dispatch
  );

export const Map = connect<StateProps, DispatchProps, Props, ReduxState>(
  mapStateToProps,
  mapDispatchToProps
)(Component);
