import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  type?: 'website' | 'article' | 'profile';
  image?: string;
  author?: string;
  jsonLd?: Record<string, any>;
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  canonicalUrl,
  type = 'website',
  image = 'https://substreamedu.com/og-image.png',
  author = 'SubStreamEdu',
  jsonLd,
}) => {
  const siteName = 'SubStreamEdu';
  const fullTitle = `${title} | ${siteName}`;

  return (
    <Helmet>
      {}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:site_name" content={siteName} />

      {}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@substreamedu" /> 
      <meta name="twitter:creator" content="@substreamedu" />

      {}
      {type === 'article' && <meta property="article:author" content={author} />}

      {}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};
