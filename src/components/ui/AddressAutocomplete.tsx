'use client';

import React, { useEffect, useRef } from 'react';
import Script from 'next/script';

interface AddressAutocompleteProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onSelect'> {
  onPlaceSelected: (address: string, lat: number | null, lng: number | null) => void;
  apiKey?: string;
}

export default function AddressAutocomplete({ onPlaceSelected, apiKey, ...props }: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const initAutocomplete = () => {
    if (!window.google || !inputRef.current) return;
    
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'geometry', 'name'],
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (!place) return;

      if (place.geometry && place.geometry.location) {
        const address = place.formatted_address || place.name || '';
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        onPlaceSelected(address, lat, lng);
      } else {
        // Fallback if they hit enter without selecting
        onPlaceSelected(inputRef.current?.value || '', null, null);
      }
    });
  };

  const mapApiKey = apiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  return (
    <>
      {mapApiKey && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${mapApiKey}&libraries=places`}
          strategy="lazyOnload"
          onLoad={initAutocomplete}
        />
      )}
      <input
        ref={inputRef}
        type="text"
        {...props}
      />
    </>
  );
}
