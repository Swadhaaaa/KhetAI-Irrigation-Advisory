function parsePagination(query = {}, { defaultLimit = 50, maxLimit = 100 } = {}) {
    const requestedPage = Number.parseInt(query.page, 10);
    const requestedLimit = Number.parseInt(query.limit, 10);
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, maxLimit)
        : defaultLimit;
    return { page, limit, skip: (page - 1) * limit };
}

function paginationMeta(page, limit, total) {
    return {
        page,
        limit,
        total,
        totalPages: total ? Math.ceil(total / limit) : 0,
    };
}

function hasPaginationQuery(query = {}) {
    return query.page !== undefined || query.limit !== undefined;
}

module.exports = { parsePagination, paginationMeta, hasPaginationQuery };
