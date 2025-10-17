"use client";

import { type FC, useEffect, useRef } from "react";
import "./style.css";

const PcbAnimation: FC = () => {
	const containerRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);

	useEffect(() => {
		const { floor, random } = Math;

		if (!containerRef.current || !svgRef.current) return;

		const con = containerRef.current;
		const svgCon = svgRef.current;

		const settings = {
			size: 20,
			wireMaxLen: 40,
			stroke: "#81ecec",
			bg: "#000",
			pathBg: "#2d3436",
			pathBloomLength: 10,
			bloomSpeed: 50,
			straightness: 2,
		};

		const { width, height } = con.getBoundingClientRect();
		svgCon.setAttribute("width", `${width}`);
		svgCon.setAttribute("height", `${height}`);

		const rows = floor(height / settings.size);
		const cols = floor(width / settings.size);
		let availableNum = floor(rows * cols);
		const cells: Cell[] = [];
		const cellsMap: Record<string, Cell> = {};
		const wires: Wire[] = [];
		const dirs: Array<[number, number]> = [
			[0, 1],
			[1, 1],
			[1, 0],
			[1, -1],
			[0, -1],
			[-1, -1],
			[-1, 0],
			[-1, 1],
		];

		class Cell {
			x: number;
			y: number;
			available = true;
			dirInd = floor(random() * dirs.length);
			constructor(x: number, y: number) {
				this.x = x;
				this.y = y;
			}
		}

		class Wire {
			cells: Cell[] = [];
			constructor(start: Cell) {
				start.available = false;
				this.cells.push(start);
				availableNum -= 1;
			}

			validNoCrossOver(c1: Cell, dirInd: number) {
				if ([0, 2, 4, 6].includes(dirInd)) return true;

				const check = (x: number, y: number) =>
					cellsMap[`${x},${y}`]?.available ?? true;

				if (dirInd === 1) return check(c1.x, c1.y - 1) && check(c1.x + 1, c1.y);
				if (dirInd === 3) return check(c1.x + 1, c1.y) && check(c1.x, c1.y + 1);
				if (dirInd === 5) return check(c1.x - 1, c1.y) && check(c1.x, c1.y + 1);
				if (dirInd === 7) return check(c1.x - 1, c1.y) && check(c1.x, c1.y - 1);

				return false;
			}

			generate() {
				while (this.cells.length < settings.wireMaxLen) {
					const last = this.cells[this.cells.length - 1];
					const tries = random() < 0.5 ? [0, 1, -1] : [0, -1, 1];

					while (tries.length > 0) {
						let dirInd =
							last.dirInd +
							tries.splice(
								floor(random() ** settings.straightness * tries.length),
								1,
							)[0];
						dirInd = dirInd < 0 ? 8 + dirInd : dirInd % 8;
						const dir = dirs[dirInd];

						const x = last.x + dir[0];
						const y = last.y + dir[1];
						const index = y * cols + x;
						const next =
							index >= 0 && index < cells.length ? cells[index] : null;

						if (
							x < 0 ||
							x >= cols ||
							y < 0 ||
							y >= rows ||
							!next ||
							!next.available ||
							!this.validNoCrossOver(last, dirInd)
						)
							continue;

						next.available = false;
						next.dirInd = dirInd;
						availableNum -= 1;
						this.cells.push(next);
						break;
					}
					if (tries.length === 0) break;
				}
			}

			draw() {
				const path = document.createElementNS(
					"http://www.w3.org/2000/svg",
					"path",
				);
				const circle1 = document.createElementNS(
					"http://www.w3.org/2000/svg",
					"circle",
				);
				const circle2 = document.createElementNS(
					"http://www.w3.org/2000/svg",
					"circle",
				);

				let d = "";
				const s = settings.size;
				const r = random() * (s / 6) + s / 12;

				circle1.setAttribute("r", `${r}`);
				circle2.setAttribute("r", `${r}`);
				circle1.setAttribute("stroke", settings.stroke);
				circle2.setAttribute("stroke", settings.stroke);
				circle1.setAttribute("stroke-width", `${r / 4}`);
				circle2.setAttribute("stroke-width", `${r / 2}`);
				const isFill = random() > 0.5;
				circle1.setAttribute("fill", isFill ? settings.stroke : settings.bg);
				circle2.setAttribute("fill", isFill ? settings.stroke : settings.bg);

				for (let i = 0; i < this.cells.length; i++) {
					const cur = this.cells[i];
					if (i === 0) {
						d += `M ${cur.x * s + s / 2} ${cur.y * s + s / 2}`;
						circle1.setAttribute("cx", `${cur.x * s + s / 2}`);
						circle1.setAttribute("cy", `${cur.y * s + s / 2}`);
					}
					d += ` L ${cur.x * s + s / 2} ${cur.y * s + s / 2}`;
					if (i === this.cells.length - 1) {
						circle2.setAttribute("cx", `${cur.x * s + s / 2}`);
						circle2.setAttribute("cy", `${cur.y * s + s / 2}`);
					}
				}

				path.setAttribute("d", d);
				path.setAttribute("fill", "none");
				path.setAttribute("stroke", settings.stroke);
				path.setAttribute("stroke-width", `${r * 2}`);

				const length = path.getTotalLength();
				path.style.cssText = `
          --len: ${length};
          --len-1:${-length};
          --len_add_bloomLen:${length + settings.pathBloomLength};
          --animate-time:${(length / settings.bloomSpeed).toFixed(1)}s;
        `;

				const isAnimated = random() > 0.5;
				if (isAnimated) {
					const pathBg = path.cloneNode(false) as SVGPathElement;
					path.setAttribute("stroke", settings.pathBg);
					svgCon.appendChild(pathBg);
				}
				path.classList.add(
					isAnimated ? "animated-path-repeat" : "animated-path-once",
				);
				svgCon.appendChild(path);
				svgCon.appendChild(circle1);
				svgCon.appendChild(circle2);
			}
		}

		for (let y = 0; y < rows; y++) {
			for (let x = 0; x < cols; x++) {
				const cell = new Cell(x, y);
				cells.push(cell);
				cellsMap[`${x},${y}`] = cell;
			}
		}

		while (wires.length < availableNum) {
			const cell = cells[floor(random() * cells.length)];
			if (!cell.available) continue;

			const wire = new Wire(cell);
			wires.push(wire);
			wire.generate();
			wire.draw();
		}
	}, []);

	return (
		<div
			ref={containerRef}
			className="con"
			style={{
				width: "100vw",
				height: "100vh",
				background: "#000",
				overflow: "hidden",
                position: "relative"
			}}
		>
			<svg
				ref={svgRef}
				className="svgCon"
				xmlns="http://www.w3.org/2000/svg"
				version="1.1"
			/>
		</div>
	);
};

export default PcbAnimation;
