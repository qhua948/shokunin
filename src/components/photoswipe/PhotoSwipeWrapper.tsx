import 'photoswipe/dist/photoswipe.css';
import 'photoswipe/dist/default-skin/default-skin.css';

import {
  FastForwardOutlined,
  InfoOutlined,
  OpenInNewOutlined,
  PauseOutlined,
  PlayArrowOutlined,
} from '@material-ui/icons';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import PhotoSwipe from 'photoswipe';
import PhotoSwipeUI_Default from 'photoswipe/dist/photoswipe-ui-default';
import clsx from 'clsx';
import { makeStyles } from '@material-ui/core';
import { useHistory } from 'react-router-dom';

enum PlaybackState {
  PAUSED = 0,
  NORMAL = 1,
  FAST = 2,
}

const PLAYBACK_ICON_STATE: React.ReactNode[] = [
  <PlayArrowOutlined />,
  <FastForwardOutlined />,
  <PauseOutlined />,
];

export interface PhotoSwipeItem<I> extends PhotoSwipeUI_Default.Item {
  htmlId: string;
  id: number;
  src: string;
  thumbnail: string;
  w: number;
  h: number;
  thumbnailW: number;
  thumbnailH: number;
  description: string;
  title: string;
  author: string;
  msrc: string;
  m?: {
    src: string;
    w: number;
    h: number;
  };
  o?: {
    src: string;
    w: number;
    h: number;
  };
  lazySrc: string;
  info?: I | undefined;
  externalLink?: string;
}

export type PhotoSwipeWrapperChildFunction = (
  openPhotoSwipe: (index: number) => void
) => React.ReactNode;

const useStyles = makeStyles((theme) => ({
  photoSwipe: {
    '& .pswp__top-bar': {
      transition: 'all 0.2s ease',
      backgroundColor: theme.palette.background.paper,
      boxShadow: theme.shadows[4],
      opacity: 1,
    },
    '& .pswp__caption': {
      backgroundColor: theme.palette.background.paper,
      boxShadow: theme.shadows[4],
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      height: '44px',
      minHeight: 0,
      overflow: 'hidden',
      '&.expanded': {
        height: '70%',
        overflowY: 'auto',
        transform: 'none',
      },
    },
    '& .pswp__bg': {
      backgroundColor: theme.palette.background.default,
    },
    '& .pswp__ui--idle': {
      '& .pswp__top-bar': {
        transform: 'translateY(-100%)',
      },
      '& .pswp__caption': {
        transform: 'translateY(100%)',
      },
    },
    '& .pswp__button--arrow--right::before': {
      backgroundColor: theme.palette.background.paper,
      boxShadow: theme.shadows[4],
    },
    '& .pswp__button--arrow--left::before': {
      backgroundColor: theme.palette.background.paper,
      boxShadow: theme.shadows[4],
    },
  },
  btn: {
    background: 'none !important',
    '& svg': {
      fill: '#FFF',
      marginTop: '3px',
    },
  },
  btnAdjust: {
    '& svg': {
      height: '19px',
      width: '19px',
    },
  },
}));

export function PhotoSwipeWrapper<I>({
  children,
  images = [],
  scrollIntoView,
  scrollOffset = 0,
}: {
  children?: PhotoSwipeWrapperChildFunction;
  images?: PhotoSwipeItem<I>[];
  scrollIntoView?: boolean;
  scrollOffset?: number;
}) {
  const classes = useStyles();

  const history = useHistory();
  const anchor = useRef<HTMLDivElement>(null);
  const [photoSwipe, setPhotoSwipe] = useState<PhotoSwipe<
    PhotoSwipeUI_Default.Options
  > | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>(
    PlaybackState.PAUSED
  );
  const [
    playbackInterval,
    setPlaybackInterval,
  ] = useState<NodeJS.Timeout | null>(null);
  const [infoExpanded, setInfoExpanded] = useState<boolean>(false);

  const currentPhotoSwipeItem = useMemo(
    () => (photoSwipe ? images[photoSwipe.getCurrentIndex()] : null),
    [photoSwipe, images]
  );

  const openPhotoSwipe = useCallback(
    (index: number) => {
      const photoSwipeOptions: PhotoSwipeUI_Default.Options = {
        index: index ?? 0,
        loop: false,
        preload: [3, 3],
        closeElClasses: [],
        closeOnScroll: false,
        window: window,
      };

      let photoSwipe: PhotoSwipe<PhotoSwipeUI_Default.Options> | null = null;
      if (anchor.current != null) {
        photoSwipe = new PhotoSwipe<PhotoSwipeUI_Default.Options>(
          anchor.current,
          PhotoSwipeUI_Default,
          images,
          photoSwipeOptions
        );
        if (scrollIntoView) {
          photoSwipe.listen('afterChange', () => {
            if (photoSwipe) {
              const index = photoSwipe.getCurrentIndex();
              const htmlId = images[index]?.htmlId;
              if (htmlId) {
                const element = document.getElementById(htmlId);
                if (element) {
                  const rect = element.getBoundingClientRect();
                  const absoluteElementCenter =
                    rect.top + rect.height / 2 + window.pageYOffset;

                  window.scrollTo({
                    top:
                      absoluteElementCenter -
                      window.innerHeight / 2 +
                      scrollOffset,
                    behavior: 'smooth',
                  });
                }
              }
            }
          });
        }
        photoSwipe.listen('close', () => {
          setPlaybackState(PlaybackState.PAUSED);
          setInfoExpanded(false);
        });
        photoSwipe.init();
      }
      setPhotoSwipe(photoSwipe);
      return photoSwipe;
    },
    //eslint-disable-next-line
    [images, scrollIntoView, scrollOffset]
  );

  // Remove the hash on load if photoswipe is closed
  useEffect(() => {
    if (!photoSwipe && history.location.hash.length > 0) {
      history.replace({
        ...history.location,
        hash: history.location.hash.replace(/&gid=\d*?&pid=\d*/, ''),
      });
    }
    //eslint-disable-next-line
  }, []);

  // Update slideshow with newly loaded images
  useEffect(() => {
    if (photoSwipe && photoSwipe.items.length < images.length) {
      photoSwipe.items.splice(
        photoSwipe.items.length,
        0,
        ...images.slice(photoSwipe.items.length)
      );
      (photoSwipe.ui as any).update();
    }
  }, [photoSwipe, images]);

  // Set playback after each button press
  useEffect(() => {
    if (playbackInterval) {
      clearInterval(playbackInterval);
    }

    let period = Infinity;
    switch (playbackState) {
      case PlaybackState.NORMAL:
        period = 6000;
        break;
      case PlaybackState.FAST:
        period = 3000;
        break;
    }

    if (Number.isFinite(period)) {
      setPlaybackInterval(
        setInterval(() => {
          photoSwipe?.next();
        }, period)
      );
    } else {
      setPlaybackInterval(null);
    }
    //eslint-disable-next-line
  }, [playbackState]);

  return (
    <div className={classes.photoSwipe}>
      <div
        ref={anchor}
        className="pswp"
        tabIndex={-1}
        role="dialog"
        aria-hidden="true"
      >
        <div className="pswp__bg"></div>
        <div className="pswp__scroll-wrap">
          <div
            className="pswp__container"
            onClick={() => setInfoExpanded(false)}
          >
            <div className="pswp__item"></div>
            <div className="pswp__item"></div>
            <div className="pswp__item"></div>
          </div>
          <div className="pswp__ui pswp__ui--hidden">
            <div className="pswp__top-bar">
              <div className="pswp__counter"></div>
              <button
                className="pswp__button pswp__button--close"
                title="Close (Esc)"
              ></button>
              <button
                className="pswp__button pswp__button--share"
                title="Share"
              ></button>
              <button
                className="pswp__button pswp__button--fs"
                title="Toggle fullscreen"
              ></button>
              <button
                className="pswp__button pswp__button--zoom"
                title="Zoom in/out"
              ></button>
              <button
                className={clsx('pswp__button', classes.btn, classes.btnAdjust)}
                title="Info"
                onClick={() => setInfoExpanded((i) => !i)}
              >
                <InfoOutlined />
              </button>
              <button
                className={clsx('pswp__button', classes.btn)}
                title="Auto playback"
                onClick={() => {
                  setPlaybackState((playbackState + 1) % 3);
                }}
              >
                {PLAYBACK_ICON_STATE[playbackState]}
              </button>
              <a
                className={clsx('pswp__button', classes.btn)}
                href={currentPhotoSwipeItem?.externalLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <button
                  className={clsx(
                    'pswp__button',
                    classes.btn,
                    classes.btnAdjust
                  )}
                  title="Open post on site"
                >
                  <OpenInNewOutlined />
                </button>
              </a>
              <div className="pswp__preloader">
                <div className="pswp__preloader__icn">
                  <div className="pswp__preloader__cut">
                    <div className="pswp__preloader__donut"></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="pswp__share-modal pswp__share-modal--hidden pswp__single-tap">
              <div className="pswp__share-tooltip"></div>
            </div>
            <button
              className="pswp__button pswp__button--arrow--left"
              title="Previous (arrow left)"
            ></button>
            <button
              className="pswp__button pswp__button--arrow--right"
              title="Next (arrow right)"
            ></button>
            <div
              className={clsx('pswp__caption', infoExpanded && 'expanded')}
              onClick={() => setInfoExpanded((i) => !i)}
            >
              <div className="pswp__caption__center"></div>
            </div>
          </div>
        </div>
      </div>
      <div>{children && children(openPhotoSwipe)}</div>
    </div>
  );
}

export default PhotoSwipeWrapper;
