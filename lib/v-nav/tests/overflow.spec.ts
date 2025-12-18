import { describe, expect, test } from "vitest"

type VNavElement = {
  key: string
  nextGroup: string[]
  previousGroup: string[]
}

class NodeMap {
  private _map: Map<string, VNavElement[]>

  constructor() {
    this._map = new Map()
  }

  public add(group: string, el: VNavElement) {
    if (!this._map.has(group)) return this._map.set(group, [el])

    const mgroup = this._map.get(group)
    if (mgroup != null) {
      mgroup.push(el)
    }
  }

  public addAll(group: string, els: VNavElement[]) {
    // Adds in order, rather than forEach which runs asynchronously
    for (const el of els) {
      this.add(group, el)
    }
  }

  public get(group: string) {
    return this._map.get(group)
  }

  /**
   * Finds the next valid adjacent group in the el, or the last one
   * @param el VNavElement whose group you want to retrieve
   * @param nextGroup False = previousGroup, True (default) = nextGroup
   * @returns Adjacent group as string | null
   */
  public getAdjacentGroup(el?: VNavElement, nextGroup = true) {
    if (el == null) return null

    const groups = nextGroup ? el.nextGroup : el.previousGroup

    // First valid group OR last group OR null
    return (
      groups?.find(this._isRenderedGroup.bind(this)) || groups?.at(-1) || null
    )
  }

  /**
   * Checks a group to see if it exists and has at least one rendered node
   * @param group Group to check
   * @returns Whether the group has rendered node(s)
   */
  private _isRenderedGroup(group: string) {
    const nodes = this._map.get(group)

    return nodes != null && nodes.length > 0
  }
}

/**
 * Handles overflowing indeces for moving between navigation items/groups
 * @param group Originating group
 * @param i Desired index
 * @param groups Optional Ordered list of groups to overflow into
 * @returns [group, index] as close to in-bounds as possible
 */
function handleOverflow(
  nodeMap: NodeMap,
  group: string,
  i: number,
  groups?: string[] | undefined
): [string, number] {
  // TODO See if this logic can be cleaned up/shortened...
  if (groups == null || groups.includes(group)) {
    let _g = group
    let nodes = nodeMap.get(group)
    let prevGroup = groups
      ? groups[groups.indexOf(_g) - 1]
      : nodeMap.getAdjacentGroup(nodes?.at(0), false)

    // Decreasing index
    while (i < 0 && prevGroup != null) {
      if (nodes?.length) {
        group = _g
      }

      _g = prevGroup

      nodes = nodeMap.get(_g)

      i += nodes?.length || 0
      prevGroup = groups
        ? groups[groups.indexOf(_g) - 1]
        : nodeMap.getAdjacentGroup(nodes?.at(0), false)
    }

    // Increasing index
    let _i = i
    let nextGroup = groups
      ? groups[groups.indexOf(_g) + 1]
      : nodeMap.getAdjacentGroup(nodes?.at(-1))

    do {
      // No point in calculating overflow if there are no more groups to iterate
      if (nodes?.length) {
        group = _g
        i = _i

        // Example:
        // i = 10 + 1, length = 11
        // 11 - 1 = 10
        // 10 - 11 = |-1|
        const spaceLeft = nodes.length - 1 - _i

        // No overflow
        if (spaceLeft >= 0 || nextGroup == null) break
        // 1 to 0 for example
        _i = Math.abs(spaceLeft) - 1
      } else if (nextGroup == null) break

      _g = nextGroup

      nodes = nodeMap.get(_g)
      nextGroup = groups
        ? groups[groups.indexOf(_g) + 1]
        : nodeMap.getAdjacentGroup(nodes?.at(-1))
    } while (i >= 0)
  }

  return [group, i]
}

function createVNavElements(
  amount: number,
  group: string,
  previousGroup: string[],
  nextGroup: string[]
) {
  return new Array(amount).fill("").map(
    (_x, i) =>
      ({
        key: `${group}-${i}`,
        previousGroup,
        nextGroup
      } as VNavElement)
  )
}

describe("VNav/handleOverflow", () => {
  describe("Correct [group, index] returned", () => {
    const nodeMap = new NodeMap()

    const group1 = "group1"
    const group2 = "group2"
    const group3 = "group3"
    const els1 = createVNavElements(5, group1, [], [group2])
    const els2 = createVNavElements(10, group2, [group1], [group3])
    const els3 = createVNavElements(5, group3, [group2, group1], [])

    nodeMap.addAll(group1, els1)
    nodeMap.addAll(group2, els2)
    nodeMap.addAll(group3, els3)

    describe("Positive overflow", () => {
      test("Overflow into middle group", () => {
        const res1 = handleOverflow(nodeMap, group1, 11)
        expect(res1).toEqual([group2, 6])
      })

      test("No overflow in middle group", () => {
        const res2 = handleOverflow(nodeMap, group2, 2)
        expect(res2).toEqual([group2, 2])
      })

      test("Overflow across all groups", () => {
        const res3 = handleOverflow(nodeMap, group1, 24)
        expect(res3).toEqual([group3, 9])
      })
    })

    describe("Negative overflow", () => {
      test("Overflow into middle group", () => {
        const res1 = handleOverflow(nodeMap, group3, -11)
        expect(res1).toEqual([group1, 4])
      })

      test("Overflow -1 from middle group", () => {
        const res2 = handleOverflow(nodeMap, group2, -1)
        expect(res2).toEqual([group1, 4])
      })

      test("Overflow across all groups", () => {
        const res3 = handleOverflow(nodeMap, group3, -16)
        expect(res3).toEqual([group1, -1])
      })
    })
  })

  describe("No next group", () => {
    const nodeMap = new NodeMap()

    const group = "group1"
    const els = createVNavElements(5, group, [], [])

    nodeMap.addAll(group, els)

    test("Positive no group", () => {
      // No extra groups = index remains unchanged
      // Index truncation happens later in vnav lifecycle
      const res = handleOverflow(nodeMap, group, 100)
      expect(res).toEqual([group, 100])
    })

    test("Negative no group", () => {
      // No extra groups = index remains unchanged
      // Index truncation happens later in vnav lifecycle
      const res = handleOverflow(nodeMap, group, -100)
      expect(res).toEqual([group, -100])
    })
  })

  describe("Next group has no elements", () => {
    const nodeMap = new NodeMap()

    const group1 = "group1"
    const group2 = "group2"

    const els1 = createVNavElements(5, group1, [], [group2])
    const els2 = createVNavElements(0, group2, [group1], [])

    nodeMap.addAll(group1, els1)
    nodeMap.addAll(group2, els2)

    test("Positive overflow into empty group", () => {
      const res = handleOverflow(nodeMap, group1, 10)
      expect(res).toEqual([group1, 10])
    })

    // Empty first group
    nodeMap.get(group1)?.splice(0)

    test("Negative overflow into empty group", () => {
      const res = handleOverflow(nodeMap, group2, -1)
      expect(res).toEqual([group2, -1])
    })
  })

  describe("Middle group has no elements", () => {
    const nodeMap = new NodeMap()

    const group1 = "group1"
    const group2 = "group2"
    const group3 = "group3"

    const els1 = createVNavElements(5, group1, [], [group2, group3])
    const els2 = createVNavElements(0, group2, [group1], [group3])
    const els3 = createVNavElements(10, group3, [group2, group1], [])

    nodeMap.addAll(group1, els1)
    nodeMap.addAll(group2, els2)
    nodeMap.addAll(group3, els3)

    test("Positive overflow across empty middle group", () => {
      const res = handleOverflow(nodeMap, group1, 5)
      expect(res).toEqual([group3, 0])
    })

    test("Negative overflow across empty midle group", () => {
      const res = handleOverflow(nodeMap, group3, -2)
      expect(res).toEqual([group1, 3])
    })
  })
})
