import type {
  ISeriesPrimitive,
  ISeriesPrimitivePaneRenderer,
  ISeriesPrimitivePaneView,
  SeriesAttachedParameter,
  SeriesPrimitivePaneViewZOrder,
  Time,
} from "lightweight-charts";

type CanvasTarget = Parameters<ISeriesPrimitivePaneRenderer["draw"]>[0];
type AttachedSeries = SeriesAttachedParameter<Time>["series"];

export function przBandRect(
  firstY: number,
  secondY: number,
  verticalPixelRatio: number
): { top: number; height: number } {
  const top = Math.min(firstY, secondY) * verticalPixelRatio;
  const bottom = Math.max(firstY, secondY) * verticalPixelRatio;
  return { top, height: bottom - top };
}

export class PrzBandPrimitive implements ISeriesPrimitive<Time> {
  private series: AttachedSeries | null = null;
  private readonly views: readonly ISeriesPrimitivePaneView[];

  constructor(
    private readonly low: number,
    private readonly high: number,
    private readonly fillColor: string
  ) {
    const renderer: ISeriesPrimitivePaneRenderer = {
      draw: (target: CanvasTarget) => {
        const series = this.series;
        if (!series) return;
        const highY = series.priceToCoordinate(this.high);
        const lowY = series.priceToCoordinate(this.low);
        if (highY === null || lowY === null) return;
        target.useBitmapCoordinateSpace((scope) => {
          const rect = przBandRect(highY, lowY, scope.verticalPixelRatio);
          scope.context.fillStyle = this.fillColor;
          scope.context.fillRect(
            0,
            rect.top,
            scope.bitmapSize.width,
            rect.height
          );
        });
      },
    };
    this.views = [
      {
        zOrder: (): SeriesPrimitivePaneViewZOrder => "bottom",
        renderer: () => renderer,
      },
    ];
  }

  attached({ series }: SeriesAttachedParameter<Time>): void {
    this.series = series;
  }

  detached(): void {
    this.series = null;
  }

  paneViews(): readonly ISeriesPrimitivePaneView[] {
    return this.views;
  }
}
