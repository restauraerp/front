'use client';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Mail, Phone, MapPin, ExternalLink } from 'lucide-react';

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  // Brand icons are not included in lucide-react, so we'll just use a fallback for all
};

export default function ContactPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [socialLinks, setSocialLinks] = useState<any[]>([]);

  useEffect(() => {
    fetchApi('/website-settings')
      .then(res => {
        const data = res?.data || res || [];
        const map: Record<string, string> = {};
        data.forEach((s: any) => { map[s.key] = s.value; });
        setSettings(map);
      }).catch(console.error);

    fetchApi('/social-links')
      .then(res => {
        const data = res?.data || res || [];
        setSocialLinks(data.filter((l: any) => l.is_active));
      }).catch(console.error);
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-16 px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold mb-3">Contact Us</h1>
        <p className="text-base-content/50">We'd love to hear from you. Reach out via any of the channels below.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contact Info */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4">Get In Touch</h2>
          {settings.contact_email && (
            <div className="flex items-center gap-3 p-4 bg-base-200 rounded-xl">
              <Mail className="text-primary shrink-0" size={20} />
              <div>
                <p className="text-xs text-base-content/40">Email</p>
                <a href={`mailto:${settings.contact_email}`} className="font-medium hover:text-primary transition-colors">
                  {settings.contact_email}
                </a>
              </div>
            </div>
          )}
          {settings.contact_phone && (
            <div className="flex items-center gap-3 p-4 bg-base-200 rounded-xl">
              <Phone className="text-primary shrink-0" size={20} />
              <div>
                <p className="text-xs text-base-content/40">Phone</p>
                <a href={`tel:${settings.contact_phone}`} className="font-medium hover:text-primary transition-colors">
                  {settings.contact_phone}
                </a>
              </div>
            </div>
          )}
          {settings.address && (
            <div className="flex items-center gap-3 p-4 bg-base-200 rounded-xl">
              <MapPin className="text-primary shrink-0" size={20} />
              <div>
                <p className="text-xs text-base-content/40">Address</p>
                <p className="font-medium">{settings.address}</p>
              </div>
            </div>
          )}

          {/* Social Links */}
          {socialLinks.length > 0 && (
            <div className="pt-4">
              <p className="text-sm font-semibold text-base-content/50 mb-3 uppercase tracking-widest">Follow Us</p>
              <div className="flex flex-wrap gap-2">
                {socialLinks.map(l => (
                  <a
                    key={l.id}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline gap-2 capitalize"
                  >
                    {PLATFORM_ICONS[l.platform] || <ExternalLink size={14} />}
                    {l.platform}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Map Embed */}
        <div>
          <h2 className="text-xl font-bold mb-4">Find Us</h2>
          {settings.google_maps_embed ? (
            <div className="rounded-2xl overflow-hidden border border-base-200 h-64 md:h-full min-h-48">
              <iframe
                src={settings.google_maps_embed}
                className="w-full h-full"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-base-300 h-64 flex flex-col items-center justify-center text-base-content/30 gap-2">
              <MapPin size={32} />
              <p className="text-sm">Map embed not configured.</p>
              <p className="text-xs">Add a <code className="bg-base-200 px-1 rounded">google_maps_embed</code> key in Website Settings.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}