import React from 'react';
import { observer } from 'mobx-react-lite';
import { SearchInput } from 'polotno/primitives';

import { SectionTab } from 'polotno/side-panel';
import { ImagesGrid } from 'polotno/side-panel/images-grid';
import { selectImage } from 'polotno/side-panel/select-image';
import { useInfiniteAPI } from 'polotno/utils/use-api';
import { unsplashList, unsplashDownload } from 'polotno/utils/api';

// Default Unsplash results are pre-filtered to "minimal pattern" while the
// search box stays empty. Typing a term overrides it; clearing it reverts.
const DEFAULT_QUERY = 'minimal pattern';

const ImagesPanel = observer(({ store }) => {
  const { setQuery, loadMore, isReachingEnd, data, isLoading, error } =
    useInfiniteAPI({
      defaultQuery: DEFAULT_QUERY,
      getAPI: ({ page, query }) => unsplashList({ page, query }),
    });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <SearchInput
        placeholder="Search..."
        onChange={(e) => setQuery(e.target.value || DEFAULT_QUERY)}
        style={{ marginBottom: 20 }}
      />
      <p style={{ textAlign: 'center' }}>
        Photos by{' '}
        <a href="https://unsplash.com/" target="_blank" rel="noreferrer">
          Unsplash
        </a>
      </p>
      <ImagesGrid
        images={(data || []).map((d) => d.results).flat().filter(Boolean)}
        getPreview={(img) => img.urls.small}
        getAlt={(img) => img.alt_description || ''}
        onSelect={async (img, pos, targetElement) => {
          fetch(unsplashDownload(img.id));
          selectImage({
            src: img.urls.regular,
            store,
            droppedPos: pos,
            targetElement,
          });
        }}
        isLoading={isLoading}
        error={error}
        loadMore={!isReachingEnd && loadMore}
        getCredit={(img) => (
          <span>
            Photo by{' '}
            <a
              href={`https://unsplash.com/@${img.user.username}?utm_source=polotno&utm_medium=referral`}
              target="_blank"
              rel="noreferrer"
            >
              {img.user.name}
            </a>{' '}
            on{' '}
            <a
              href="https://unsplash.com/?utm_source=polotno&utm_medium=referral"
              target="_blank"
              rel="noreferrer"
            >
              Unsplash
            </a>
          </span>
        )}
      />
    </div>
  );
});

const ImagesIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path
      d="M4 5h16v14H4zM4 15l4-4 5 5M14 13l2-2 4 4M9 9a1 1 0 1 0 0-.01"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ImagesSection = {
  name: 'images',
  Tab: (props) => (
    <SectionTab name="Images" {...props}>
      <ImagesIcon />
    </SectionTab>
  ),
  Panel: ImagesPanel,
};
