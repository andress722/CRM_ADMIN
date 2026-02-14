import React from 'react';
import Head from 'next/head';

interface SeoHeadProps {
  title: string;
  description: string;
  ogType?: string;
  ogImage?: string;
  canonicalUrl?: string;
  schema?: Record<string, unknown> | null;
}

export default function SeoHead({ title, description, ogType = 'website', ogImage, canonicalUrl, schema }: SeoHeadProps) {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}
    </Head>
  );
}
