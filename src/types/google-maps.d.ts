declare global {
  namespace google.maps {
    class Map {
      constructor(element: HTMLElement | null, options?: any)
      unbindAll(): void
    }
    
    class Marker {
      constructor(options?: any)
      setMap(map: Map | null): void
      addListener(event: string, handler: () => void): void
    }
    
    class InfoWindow {
      constructor(options?: any)
      open(map: Map, marker: Marker): void
    }
    
    namespace event {
      function clearInstanceListeners(instance: any): void
    }
    
    enum MapTypeId {
      ROADMAP = 'roadmap'
    }
    
    namespace places {
      class Place {
        static searchByText(request: any): Promise<{ places: any[] }>
      }
      
      class PlacesService {
        constructor(element: HTMLElement)
        textSearch(request: any, callback: (results: any, status: any) => void): void
      }
      
      enum PlacesServiceStatus {
        OK = 'OK'
      }
    }
    
    class Geocoder {
      constructor()
      geocode(request: any, callback: (results: any, status: any) => void): void
    }
    
    enum GeocoderStatus {
      OK = 'OK'
    }
  }
}